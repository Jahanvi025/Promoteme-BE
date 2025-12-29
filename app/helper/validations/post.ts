import { check } from 'express-validator';
import { AccessIdentifier, PostStatus, PostType } from '../../schema/Post';
import mongoose from 'mongoose';

export const createPost = [
  check('access_identifier')
    .exists()
    .withMessage('Access identifier is required')
    .isIn(Object.values(AccessIdentifier))
    .withMessage('Invalid Access_identifier'),

  check('type')
    .exists()
    .withMessage('Post type is required')
    .isIn(Object.values(PostType))
    .withMessage('Invalid post type'),

  check('description')
    .if((value, { req }) => req.body.type === PostType.TEXT)
    .notEmpty()
    .withMessage('Description is required'),

  check('pollquestion')
    .optional()
    .notEmpty()
    .withMessage('Poll question is required'),

  check('pollanswers')
    .optional()
    .isArray()
    .withMessage('Poll answers must be an array'),

  check('video_url')
    .if((value, { req }) => req.body.type === PostType.VIDEO)
    .notEmpty()
    .withMessage('Video URL is required')
    .isURL()
    .withMessage('Video URL must be a valid URL'),

  check('audio_url')
    .if((value, { req }) => req.body.type === PostType.AUDIO)
    .notEmpty()
    .withMessage('Audio URL is required')
    .isURL()
    .withMessage('Audio URL must be a valid URL'),

  check('images')
    .if((value, { req }) => req.body.type === PostType.IMAGE)
    .isArray()
    .withMessage('Images must be an array'),
];


export const createComment = [
  check('comment')
    .exists()
    .withMessage('Comment is required')
    .isString()
    .withMessage('Comment must be a string'),
];

export const createReply = [
  check('comment')
    .exists()
    .withMessage('Reply is required')
    .isString()
    .withMessage('Reply must be a string'),
];


export const postStatus = [
  check('status')
    .exists().withMessage('Status is required')
    .isIn(Object.values(PostStatus)).withMessage('Status must be either "ACTIVE" or "INACTIVE"')
];

export const editPostValidation = [
  check('access_identifier')
    .optional()
    .isIn(Object.values(AccessIdentifier))
    .withMessage('Invalid Access_identifier'),

  check('type')
    .optional()
    .isIn(Object.values(PostType))
    .withMessage('Invalid post type'),

  check('description')
    .optional()
    .if((value, { req }) => req.body.type === PostType.TEXT)
    .notEmpty()
    .withMessage('Description is required'),

  check('pollquestion')
    .optional()
    .notEmpty()
    .withMessage('Poll question is required'),

  check('pollanswers')
    .optional()
    .isArray()
    .withMessage('Poll answers must be an array'),

  check('video_url')
    .optional()
    .if((value, { req }) => req.body.type === PostType.VIDEO)
    .notEmpty()
    .withMessage('Video URL is required')
    .isURL()
    .withMessage('Video URL must be a valid URL'),

  check('audio_url')
    .optional()
    .if((value, { req }) => req.body.type === PostType.AUDIO)
    .notEmpty()
    .withMessage('Audio URL is required')
    .isURL()
    .withMessage('Audio URL must be a valid URL'),

  check('images')
    .optional()
    .if((value, { req }) => req.body.type === PostType.IMAGE)
    .isArray()
    .withMessage('Images must be an array'),
];

export const sendTipValidation = [
  check('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Post ID'),

  check('tipAmount')
    .notEmpty()
    .withMessage('Tip amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Tip amount must be a positive number'),
];