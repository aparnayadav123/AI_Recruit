const bcrypt = require('bcryptjs');
const hash = '$2a$10$pof7/LN7RgBV65iSL/3FL.9lKn.JZJxsCAAj6lf.IItJLBSbc2gmC';
console.log('Testing admin123:', bcrypt.compareSync('admin123', hash));
console.log('Testing Admin@123:', bcrypt.compareSync('Admin@123', hash));
