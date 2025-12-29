import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = './../../uploads/';

        if (file.mimetype.startsWith('image')) {
            uploadPath += 'images/';
        } else if (file.mimetype.startsWith('audio')) {
            uploadPath += 'audio/';
        } else if (file.mimetype.startsWith('video')) {
            uploadPath += 'videos/';
        } else {
            return cb(new Error('Invalid file type'), '');
        }

        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const upload = multer({ storage: storage });