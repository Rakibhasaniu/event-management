/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-this-alias */
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../config';
import { UserStatus } from './user.constant';
import { TUser, UserModel } from './user.interface';

const userProfileSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
}, { _id: false });

const passwordResetHistorySchema = new Schema({
  resetAt: {
    type: Date,
    required: true,
  },
  resetMethod: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
}, { _id: false });

const userSchema = new Schema<TUser, UserModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    needsPasswordChange: {
      type: Boolean,
      default: false, // Changed to false for better UX
    },
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['admin', 'user'], // Updated to only admin and user
      required: true,
    },
    status: {
      type: String,
      enum: UserStatus,
      default: 'active', // Changed from 'in-progress' to 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    passwordChangeCount: {
      type: Number,
      default: 0,
    },
    resetRequestCount: {
      type: Number,
      default: 0,
    },
    lastResetRequest: {
      type: Date,
    },
    passwordResetHistory: [passwordResetHistorySchema],
    profile: {
      type: userProfileSchema,
      required: function() {
        return !this.isDeleted;
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ id: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Auto-generate user ID
userSchema.pre('save', async function (next) {
  const user = this;
  
  // Generate ID if not exists
  if (!user.id) {
    // Use User model instead of generic model
    const User = this.constructor as any;
    const count = await User.countDocuments();
    user.id = `USER-${String(count + 1).padStart(6, '0')}`;
  }
  
  // Hash password if modified
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  
  next();
});

// Set empty password after saving (for security)
userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find user by custom ID
userSchema.statics.isUserExistsByCustomId = async function (id: string) {
  return await this.findOne({ id, isDeleted: { $ne: true } }).select('+password');
};

// Static method to find user by email
userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await this.findOne({ email, isDeleted: { $ne: true } }).select('+password');
};

// Static method to check password
userSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashedPassword: string,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

// Static method to check JWT timing
userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<TUser, UserModel>('User', userSchema);