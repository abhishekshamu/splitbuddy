require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Group = require('../models/Group');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Group API - Create Group Validation Audit', () => {
  let token;
  let testUser;

  beforeAll(async () => {
    // Check if mongoose is connected, otherwise wait
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (uri) {
        await mongoose.connect(uri);
      }
    }

    // Create a mock user for authentication
    testUser = await User.findOne({ email: 'test_group_creator@example.com' });
    if (!testUser) {
      testUser = await User.create({
        full_name: 'Test Creator',
        email: 'test_group_creator@example.com',
        password: 'password123',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
      });
    }

    token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'yoursupersecretjwtkeyhere', { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await Group.deleteMany({ created_by: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear any active groups created by test user before each test
    await Group.deleteMany({ created_by: testUser._id });
  });

  it('should successfully create a group with valid fields', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Valid Group Name',
        emoji: '🏖️',
        type: 'trip',
        color: '#ff5fcb',
        visibility: 'private',
        members: ['Roommate A', 'Roommate B']
      });

    expect(res.status).toBe(201);
    expect(res.body.group).toBeDefined();
    expect(res.body.group.name).toBe('Valid Group Name');
    expect(res.body.group.emoji).toBe('🏖️');
    expect(res.body.group.color).toBe('#ff5fcb');
    expect(res.body.group.visibility).toBe('private');
    expect(res.body.group.members.length).toBe(3); // Creator + 2 roommates
  });

  it('should fail if group name is missing or empty', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '  ',
        emoji: '🏠'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Group name is required');
  });

  it('should fail if group name is less than 3 characters', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Ab',
        emoji: '🏠'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be between 3 and 50 characters');
  });

  it('should fail if group name is greater than 50 characters', async () => {
    const longName = 'A'.repeat(51);
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: longName,
        emoji: '🏠'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be between 3 and 50 characters');
  });

  it('should prevent creating duplicate group names for the same user', async () => {
    // First create
    await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unique Group Name',
        emoji: '🏠'
      });

    // Second create with same name (case-insensitive and trimmed)
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: ' unique group name  ',
        emoji: '🏖️'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('You already have an active group with this name');
  });

  it('should fail with invalid group type', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Valid Name',
        type: 'invalid_type_here'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid group type');
  });

  it('should fail with invalid hex theme color', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Valid Name',
        color: 'not-a-color'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid color format');
  });

  it('should fail if there is a duplicate member in the list', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Group with Duplicates',
        members: ['Sahil', 'sahil'] // Case-insensitive duplicate
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Duplicate member detected');
  });

  it('should fail with invalid group visibility', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Valid Name',
        visibility: 'secret'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Visibility must be either public or private');
  });
});
