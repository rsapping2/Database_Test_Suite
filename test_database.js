// test_database.js

/*
 * FIXES APPLIED TO RESOLVE DATABASE ERRORS:
 * 
 * 1. FOREIGN KEY CONSTRAINT VIOLATION:
 *    - Problem: user_audit_logs table has foreign key reference to users table
 *    - Solution: Added transaction wrapper around cleanup operations for better error handling
 *    - Note: Deletion order was already correct (child table first, then parent table)
 * 
 * 2. MISSING REQUIRED FIELD:
 *    - Problem: password_hash field is NOT NULL in database schema but was missing in first test
 *    - Solution: Added password_hash field and value to the first test case
 *    - Used same hashed password value as other tests for consistency
 * 
 * These changes ensure all tests pass without constraint violations or validation errors.
 */

const { Client } = require('pg');
const { expect } = require('chai');

describe('Database Test', function () {
  let client;

  before(async function () {
    client = new Client({
      user: 'testuser',
      host: 'localhost',
      database: 'testdb',
      password: 'password',
      port: 5432,
    });
    await client.connect();
  });

  after(async function () {
    await client.end();
  });

  beforeEach(async function () {
    // Changes: Added transaction wrapper for better error handling
    // The original code had foreign key constraint violations during cleanup
    // because user_audit_logs table references users table via foreign key

    // Changes Explained: BEGIN starts a transaction (groups multiple database
    // operations together), COMMIT saves all changes permanently, and ROLLBACK
    // undoes all changes if something goes wrong. This ensures either all 
    // cleanup operations succeed together or none of them do, preventing 
    // partial failures that could leave your database in a messy state.
    await client.query('BEGIN');
    
    try {
      // Disable triggers temporarily for cleanup
      await client.query('ALTER TABLE users DISABLE TRIGGER user_audit_trigger');
      
      // Clean up any test data - delete from child table first to respect foreign key constraints
      // ORDER MATTERS: Must delete from user_audit_logs before users due to foreign key constraint
      await client.query('DELETE FROM user_audit_logs');
      await client.query('DELETE FROM users');
      
      // Re-enable triggers
      await client.query('ALTER TABLE users ENABLE TRIGGER user_audit_trigger');
      
      // Commit the transaction
      await client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  });

  it('should create a user with valid credentials', async function () {
    try {
      // ORIGINAL CODE (commented out - missing password_hash field):
      // await client.query(`
      //   INSERT INTO users (
      //     email,
      //     username,
      //     first_name,
      //     last_name,
      //     date_of_birth,
      //     phone_number
      //   ) VALUES (
      //     'test.user@example.com',
      //     'testuser123',
      //     'Test',
      //     'User',
      //     '1990-01-15',
      //     '+1-555-000-0000'
      //   )`);
      
      // Changes Explain - had to add missing fields to insert user
      // 1) Added required password_hash field
      // 2) Added hashed password value
      await client.query(`
        INSERT INTO users (
          email,
          username,
          password_hash,  
          first_name,
          last_name,
          date_of_birth,
          phone_number
        ) VALUES (
          'test.user@example.com',
          'testuser123',
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i77i',
          'Test',
          'User',
          '1990-01-15',
          '+1-555-000-0000'
        )`);
      
      // Query to verify the user was created
      const result = await client.query(`
        SELECT * FROM users 
        WHERE email = 'test.user@example.com'
      `);
      
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].username).to.equal('testuser123');
    } catch (error) {
      throw new Error('Failed to create user: ' + error.message);
    }
  });

  it('should reject duplicate usernames', async function () {
    // First insert
    await client.query(`
      INSERT INTO users (
        email,
        username,
        password_hash,
        first_name,
        last_name,
        date_of_birth,
        phone_number
      ) VALUES (
        'user1@example.com',
        'uniqueuser',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i77i',
        'First',
        'User',
        '1990-01-15',
        '+1-555-000-0001'
      )`);

    // Try to insert with same username but different email
    try {
      await client.query(`
        INSERT INTO users (
          email,
          username,
          password_hash,
          first_name,
          last_name,
          date_of_birth,
          phone_number
        ) VALUES (
          'user2@example.com',
          'uniqueuser',
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i77i',
          'Second',
          'User',
          '1992-01-15',
          '+1-555-000-0002'
        )`);
      throw new Error('Should not reach this point');
    } catch (error) {
      expect(error.code).to.equal('23505'); // PostgreSQL unique violation error code
    }
  });

  it('should reject users younger than 13 years old', async function () {
    const tooYoungDate = new Date();
    tooYoungDate.setFullYear(tooYoungDate.getFullYear() - 12);
    
    try {
      await client.query(`
        INSERT INTO users (
          email,
          username,
          password_hash,
          first_name,
          last_name,
          date_of_birth,
          phone_number
        ) VALUES (
          'young@example.com',
          'younguser',
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i77i',
          'Young',
          'User',
          $1,
          '+1-555-000-0003'
        )`, [tooYoungDate.toISOString()]);
      throw new Error('Should not reach this point');
    } catch (error) {
      expect(error.code).to.equal('23514'); // PostgreSQL check violation error code
    }
  });
});
