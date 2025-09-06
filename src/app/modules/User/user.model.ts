import bcrypt from 'bcrypt';
import { Model, Schema, model } from 'mongoose';
import config from '../../config';
import { TUser, UserModel } from './user.interface';

const userSchema = new Schema<TUser, UserModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
      select: 0, // Hide password by default
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    needsPasswordChange: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
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
    passwordResetHistory: [
      {
        resetAt: { type: Date },
        resetMethod: { type: String },
        ipAddress: { type: String },
      },
    ],
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      bio: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
      dateOfBirth: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ id: 1 });
userSchema.index({ isDeleted: 1, status: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

// Post-save middleware to remove password from response
userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

// Static method to check if user exists by custom ID
userSchema.statics.isUserExistsByCustomId = async function (id: string) {
  return await User.findOne({ id, isDeleted: { $ne: true } }).select('+password');
};

// Static method to check if user exists by email
userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await User.findOne({ email, isDeleted: { $ne: true } }).select('+password');
};

// Static method to check if password matches
userSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashedPassword: string,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

// Static method to check if JWT was issued before password change
userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,
) {
  const passwordChangedTime = new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

// export const User = model<TUser, UserModel>('User', userSchema);
export const User = model<TUser>('User', userSchema) as Model<TUser> & UserModel;
