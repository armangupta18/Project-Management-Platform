import multer from "multer";

const storage = multer.diskStorage({
  //file is provided by multer , cb is callback
  destination: function (req, file, cb) {
    //In cb(firstParameter is null)
    cb(null, `./public/images`);
  },
  filename: function (req, file, cb) {
    //many files can be of same name so we r just handling that case
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 1 * 1000 * 1000,
  },
});
