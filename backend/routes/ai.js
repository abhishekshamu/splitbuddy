/**
 * SplitBuddy – AI Assistant Routes
 * POST /api/ai/chat
 * GET  /api/ai/summary/:group_id
 * GET  /api/ai/tips/:group_id
 */

const router  = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const Expense      = require('../models/Expense');
const Group        = require('../models/Group');
const User         = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Build financial context for AI ────────────────────────────────
const buildGroupContext = async (group_id, user_id) => {
  const gId = new mongoose.Types.ObjectId(group_id);
  
  const expenses = await Expense.find({ group: gId, is_deleted: false })
    .populate('paid_by', 'full_name')
    .sort({ expense_date: -1 })
    .limit(30);

  const group = await Group.findById(gId);
  
  // Balances
  const paidResult = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false } },
    { $group: { _id: '$paid_by', total: { $sum: '$amount' } } }
  ]);

  const owedResult = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false } },
    { $unwind: '$splits' },
    { $group: { _id: '$splits.user', total: { $sum: '$splits.owed_amount' } } }
  ]);

  const paidMap = Object.fromEntries(paidResult.map(r => [r._id.toString(), r.total]));
  const owedMap = Object.fromEntries(owedResult.map(r => [r._id.toString(), r.total]));

  const balances = group.members.filter(m => m.is_active).map(m => {
    const uId = m.user.toString();
    const paid = paidMap[uId] || 0;
    const owed = owedMap[uId] || 0;
    return {
      user_id: uId,
      full_name: m.nickname || uId, // Nickname or ID as placeholder
      net_balance: paid - owed,
      total_paid: paid,
      total_owed: owed
    };
  });

  // This month spend
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const thisMonthResult = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false, expense_date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const me = await User.findById(user_id, 'full_name');

  return { 
    expenses: expenses.map(e => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      paid_by: e.paid_by.full_name,
      expense_date: e.expense_date
    })), 
    balances, 
    group: {
      name: group.name,
      monthly_budget: group.monthly_budget,
      this_month: thisMonthResult[0]?.total || 0
    }, 
    userName: me?.full_name 
  };
};

// ── AI Chat ───────────────────────────────────────────────────────
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, group_id, conversation_history = [] } = req.body;
  if (!message) throw new AppError('message is required', 400);

  let contextBlock = '';
  if (group_id) {
    const ctx = await buildGroupContext(group_id, req.user.id);
    contextBlock = `
=== GROUP FINANCIAL CONTEXT ===
Group: ${ctx.group?.name}
Monthly Budget: ₹${ctx.group?.monthly_budget || 'Not set'}
This Month Spend: ₹${parseFloat(ctx.group?.this_month || 0).toFixed(0)}

BALANCES:
${ctx.balances.map(b => `  ${b.full_name}: Net ${b.net_balance >= 0 ? '+' : ''}₹${parseFloat(b.net_balance).toFixed(0)} (Paid ₹${parseFloat(b.total_paid).toFixed(0)}, Owes ₹${parseFloat(b.total_owed).toFixed(0)})`).join('\n')}

RECENT EXPENSES (last 10):
${ctx.expenses.slice(0, 10).map(e => `  ${e.expense_date} | ${e.category} | ₹${e.amount} | "${e.title}" | Paid by ${e.paid_by}`).join('\n')}
================================
`;
  }

  const systemPrompt = `You are BuddyAI, the smart expense assistant for SplitBuddy — an app used by Indian bachelors, roommates, and hostel students to split bills and manage shared expenses.

${contextBlock}

Your personality:
- Friendly, casual, and helpful — like a smart friend
- Use Indian context (₹ symbol, cities, common expenses like Jio, BSES, Swiggy, Zomato, Big Basket)
- Support both Hindi and English (respond in the same language as the user)
- Give practical, actionable advice
- Be concise but thorough
- Use emojis to make responses engaging
- Address the user (${req.user.full_name || 'friend'}) by name sometimes

You can help with:
- Who owes whom and how much
- Expense split suggestions
- Monthly saving tips
- Budget analysis
- Identifying unusual spending
- Suggesting fair splits
- Settlement optimization

Always be accurate with numbers. If asked about specific amounts, calculate carefully.`;

  const messages = [
    ...conversation_history.slice(-10).map(m => ({
      role:    m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const completion = await anthropic.messages.create({
    model:      'claude-3-5-sonnet-20240620',
    max_tokens: 600,
    system:     systemPrompt,
    messages,
  });

  const reply = completion.content[0].text;

  res.json({ reply, usage: completion.usage });
}));

// ── Auto-generate monthly summary ────────────────────────────────
router.get('/summary/:group_id', asyncHandler(async (req, res) => {
  const ctx = await buildGroupContext(req.params.group_id, req.user.id);

  const prompt = `Generate a friendly 3-4 sentence monthly expense summary for the group "${ctx.group?.name}".
Total spent this month: ₹${parseFloat(ctx.group?.this_month || 0).toFixed(0)}
Budget: ₹${ctx.group?.monthly_budget || 'not set'}
Top expenses: ${ctx.expenses.slice(0, 5).map(e => `${e.title} ₹${e.amount}`).join(', ')}

Keep it casual, use emojis, mention whether they're on track with budget. Max 3 sentences.`;

  const completion = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  res.json({ summary: completion.content[0].text });
}));

// ── Get personalized saving tips ──────────────────────────────────
router.get('/tips/:group_id', asyncHandler(async (req, res) => {
  const ctx = await buildGroupContext(req.params.group_id, req.user.id);
  const gId = new mongoose.Types.ObjectId(req.params.group_id);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const cats = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false, expense_date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);

  const prompt = `Based on this group's spending data, give exactly 3 practical money-saving tips.
Spending breakdown: ${cats.map(c => `${c._id}: ₹${parseFloat(c.total).toFixed(0)}`).join(', ')}
Monthly budget: ₹${ctx.group?.monthly_budget || 'not set'}
This month total: ₹${parseFloat(ctx.group?.this_month || 0).toFixed(0)}

Format as JSON array with exactly 3 objects: [{"tip": "...", "potential_saving": "₹X-Y/month", "emoji": "..."}]
Be specific to Indian context. Return ONLY valid JSON, no markdown.`;

  const completion = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const tips = JSON.parse(completion.content[0].text);
    res.json({ tips });
  } catch {
    res.json({ tips: [{ tip: completion.content[0].text, emoji: '💡', potential_saving: 'Varies' }] });
  }
}));

// ── Detect unusual spending ────────────────────────────────────────
router.get('/anomalies/:group_id', asyncHandler(async (req, res) => {
  const gId = new mongoose.Types.ObjectId(req.params.group_id);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const stats = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false, expense_date: { $gte: sixtyDaysAgo } } },
    {
      $group: {
        _id: '$category',
        avg_amount: { $avg: '$amount' },
        expenses: { $push: { title: '$title', amount: '$amount', date: '$expense_date' } }
      }
    }
  ]);

  const anomalies = [];
  stats.forEach(s => {
    s.expenses.forEach(e => {
      if (e.amount > s.avg_amount * 1.8) {
        anomalies.push({ category: s._id, ...e });
      }
    });
  });

  res.json({ anomalies: anomalies.sort((a,b) => b.date - a.date).slice(0, 5) });
}));

module.exports = router;

module.exports = router;
