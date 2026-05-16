const router = require('express').Router();
const Expense = require('../models/Expense');
const Group   = require('../models/Group');
const User    = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

// Monthly summary for a group
router.get('/group/:group_id/monthly', asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  const gId = new mongoose.Types.ObjectId(req.params.group_id);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - parseInt(months));

  const monthly = await Expense.aggregate([
    { $match: { group: gId, is_deleted: false, expense_date: { $gte: cutoff } } },
    {
      $group: {
        _id: {
          month: { $month: '$expense_date' },
          year: { $year: '$expense_date' },
          category: '$category'
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        year: '$_id.year',
        category: '$_id.category',
        total: 1,
        count: 1,
        month_label: {
          $concat: [
            { $arrayElemAt: [['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
            ' ',
            { $substr: ['$_id.year', 0, 4] }
          ]
        }
      }
    },
    { $sort: { year: -1, month: -1 } }
  ]);

  res.json({ monthly });
}));

// Category breakdown
router.get('/group/:group_id/categories', asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  const gId = new mongoose.Types.ObjectId(req.params.group_id);
  
  const match = { group: gId, is_deleted: false };
  if (from_date || to_date) {
    match.expense_date = {};
    if (from_date) match.expense_date.$gte = new Date(from_date);
    if (to_date)   match.expense_date.$lte = new Date(to_date);
  }

  const categories = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total_sum: { $sum: '$total' },
        items: { $push: { category: '$_id', total: '$total', count: '$count' } }
      }
    },
    { $unwind: '$items' },
    {
      $project: {
        _id: 0,
        category: '$items.category',
        total: '$items.total',
        count: '$items.count',
        percent: { $round: [{ $multiply: ['$items.total', 100 / '$total_sum'] }, 1] }
      }
    },
    { $sort: { total: -1 } }
  ]);

  res.json({ categories });
}));

// Per-member spend breakdown
router.get('/group/:group_id/members', asyncHandler(async (req, res) => {
  const gId = new mongoose.Types.ObjectId(req.params.group_id);
  const group = await Group.findById(gId).populate('members.user', 'full_name avatar_url');
  
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

  const members = group.members.filter(m => m.is_active).map(m => {
    const uId = m.user._id.toString();
    const paid = paidMap[uId] || 0;
    const owed = owedMap[uId] || 0;
    return {
      id: uId,
      full_name: m.user.full_name,
      avatar_url: m.user.avatar_url,
      paid,
      owed,
      net_balance: parseFloat((paid - owed).toFixed(2))
    };
  });

  res.json({ members });
}));

// Overall user stats across all groups
router.get('/user/summary', asyncHandler(async (req, res) => {
  const uId = new mongoose.Types.ObjectId(req.user.id);

  const totalExpenses = await Expense.countDocuments({ 
    $or: [{ paid_by: uId }, { 'splits.user': uId }],
    is_deleted: false 
  });

  const paidResult = await Expense.aggregate([
    { $match: { paid_by: uId, is_deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const owedResult = await Expense.aggregate([
    { $match: { is_deleted: false } },
    { $unwind: '$splits' },
    { $match: { 'splits.user': uId } },
    { $group: { _id: null, total: { $sum: '$splits.owed_amount' } } }
  ]);

  const groupsCount = await Group.countDocuments({ 'members.user': uId, 'members.is_active': true });

  res.json({
    summary: {
      total_expenses: totalExpenses,
      total_paid: paidResult[0]?.total || 0,
      total_owed_share: owedResult[0]?.total || 0,
      groups_active: groupsCount
    }
  });
}));

module.exports = router;
