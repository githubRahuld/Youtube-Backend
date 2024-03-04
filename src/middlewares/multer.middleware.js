import multer from "multer";

//this method store file on disk Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.orignalname);
  },
});

export const upload = multer({ storage });
