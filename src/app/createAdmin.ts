/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { User } from './modules/User/user.model';
import config from './config';

const createDefaultAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.database_url as string);
    console.log('Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      role: 'admin', 
      isDeleted: false 
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Admin ID:', existingAdmin.id);
      return;
    }

    // Generate admin ID manually
    const userCount = await User.countDocuments();
    const adminId = `USER-${String(userCount + 1).padStart(6, '0')}`;

    // Create default admin with explicit ID
    const adminData = {
      id: adminId, // Explicitly set the ID
      email: 'admin@example.com',
      password: 'Admin123!',
      role: 'admin' as const,
      status: 'active' as const,
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+1234567890',
      },
    };

    const admin = await User.create(adminData);
    console.log('Default admin created successfully!');
    console.log('Email:', admin.email);
    console.log('ID:', admin.id);
    console.log('Password: Admin123!');
    console.log('Please change the password after first login.');

  } catch (error: any) {
    console.error('Error creating admin:', error);
    
    // More detailed error info
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

createDefaultAdmin();