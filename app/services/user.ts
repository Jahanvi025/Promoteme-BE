import bcrypt from "bcrypt";
import User, { IUser, LastActiveRole } from "../schema/User";
import { resetPasswordEmailTemplate, sendEmail } from "./email";
import { createUserTokens } from "./passport-jwt";

export const createUserWithResetPasswordLink = async (data: {
  email: string;
  lastActiveRole: LastActiveRole;
}) => {
  await User.create(data);
  const user = await getUserByEmail(data.email);
  const { accessToken } = await createUserTokens(user!);
  await sendEmail({
    to: user!.email,
    subject: "Reset password",
    html: resetPasswordEmailTemplate(accessToken),
  });
  return user;
};

export const createUser = async (data: {
  displayName: string;
  email: string;
  lastActiveRole: LastActiveRole;
  password: string;
  mobile_number: string;
  username: string;
  isCreator: boolean;
  isFan: boolean;
}) => {
  const { username } = data;
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    throw new Error('Username is already in use');
  }
  const user = await User.create({ ...data, active: true });
  const { password, ...userWithoutPassword } = user.toObject();

  return userWithoutPassword;
};

export const updateUser = async (userId: string, data: Partial<IUser>) => {
  if ('password' in data) {
    delete data.password;
  }

  if ('role' in data) {
    delete data.role;
  }

  const user = await User.findOneAndUpdate(
    { _id: userId },
    {
      $set: data,
    },
    { new: true }
  ).select('-password');
  return user;
};

export const deleteUser = async (userId: string) => {
  const user = await User.deleteOne({ _id: userId });
  return user;
};

export const getUserByEmail = async (email: string) => {
  const user = await User.findOne({ email: email }).lean();
  return user;
};

export const getUserById = async (id: string) => {
  const user = await User.findById(id).lean();
  return user;
};

export const hashPassword = async (password: string) => {
  const hash = await bcrypt.hash(password, 12);
  return hash;
};


const validPassword = async function (value: string, password: string) {
  const compare = await bcrypt.compare(value, password);
  return compare;
};

export const getUserInfo = async (email: string, password: string) => {
  const user = await User.findOne({ email: email }).lean();
  if (!user || !user.active || user.blocked) {
    return {};
  }
  const isValidPassword = await validPassword(password, user.password);
  if (!isValidPassword) {
    return {};
  }

  console.log(user)
  const { accessToken } = await createUserTokens(user!);
  return { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, image: user.profile_picture, accessToken, displayName: user.displayName, username: user.username, lastActiveRole: user.lastActiveRole, isCreator: user.isCreator, isFan: user.isFan, stripeAccountId: user.stripeAccount_id };
};

export const userSocialLogin = async (data: {
  email?: string;
  lastActiveRole: LastActiveRole;
  providerId?: string;
  provider: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profile_picture: string;
}) => {
  console.log(data);
  const { email, providerId, provider, firstName, lastName, displayName, profile_picture, lastActiveRole } = data;
  const username = firstName + email?.split("@")[0];
  const userSearchQuery = email ? { email } : { providerId };

  const user = await User.findOneAndUpdate(
    userSearchQuery,
    {
      $set: { email, providerId, firstName, lastName },
      $setOnInsert: {
        provider, active: true, displayName, profile_picture, username, isFan: true, isCreator: false, lastActiveRole: lastActiveRole || 'FAN'
      }
    },
    { new: true, upsert: true }
  ).lean().exec();

  const { accessToken } = await createUserTokens(user!);

  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    profile_picture: user.profile_picture,
    accessToken,
    stripeAccountId: user.stripeAccount_id,
    lastActiveRole: user.lastActiveRole,
    isFan: user.isFan,
    isCreator: user.isCreator
  };
};
