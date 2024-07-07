const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
var nodemailer = require('nodemailer');
require('dotenv').config();
const uri = process.env.DATABASE_URL

const app = express();
const PORT = process.env.PORT ;

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTHOR,
    pass: process.env.AUTHORPASS
  }
});

const sendEmail = async (recipient, subject, content, attachments = []) => {
  const mailOptions = {
    from: process.env.AUTHOR,
    to: recipient,
    subject: subject,
    text: content,
    attachments: attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    
  }
};



const hashedPassword = bcrypt.hashSync(process.env.PASS, 10);
const users = [{ id: 1, username: process.env.USER, password: hashedPassword }];

const corsOptions = {
  origin: 'https://swiftc.ge',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

app.get('/api/allowed-ips', cors(corsOptions), (req, res) => {
  const allowedIPs = [
    process.env.ALLOWED_IP1,
  ].filter(ip => ip !== undefined); 

  res.json({ allowedIPs });
});

const applicantSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  idNumber: String,
  dob: Date,
  location: String,
  email: String,
  number: String,
  cv: String,
  vacancyName: String,
});

const Applicant = mongoose.model('Applicant', applicantSchema);

const formSchema = new mongoose.Schema({
  name: String,
  idNumber: String,
  phone: String,
  email: String,
  manufacturer: String,
  model: String,
  loan: String,
  serviceChoice: Number,
  files: [String],
});

const FormData = mongoose.model('FormData', formSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const dir = './uploads';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

app.post('/submit', upload.single('cv'), cors(corsOptions), async (req, res) => {
  const { firstName, lastName, idNumber, dob, location, email, number, vacancyName } = req.body;
  const cv = req.file ? req.file.filename : '';

  const newApplicant = new Applicant({
    firstName,
    lastName,
    idNumber,
    dob,
    location,
    email,
    number,
    cv,
    vacancyName,
  });

  try {
    await newApplicant.save();
    const attachments = req.file ? [{ filename: req.file.filename, path: req.file.path }] : [];
    const emailContent = `New Applicant:
    Name: ${firstName} ${lastName}
    ID: ${idNumber}
    DOB: ${dob}
    Location: ${location}
    Email: ${email}
    Number: ${number}
    CV: ${cv}
    Vacancy: ${vacancyName}`;

    await sendEmail('gegenavanika675@gmail.com', 'New Applicant Submission', emailContent, attachments);
    res.status(200).json({ message: 'Applicant submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving applicant' });
  }
});

app.post('/upload', cors(corsOptions), upload.array('file', 10), async (req, res) => {
  const { name, idNumber, phone, email, manufacturer, model, loan, serviceChoice } = req.body;
  const files = req.files.map(file => file.path);

  const newFormData = new FormData({
    name,
    idNumber,
    phone,
    email,
    manufacturer,
    model,
    loan,
    serviceChoice,
    files,
  });

  try {
    await newFormData.save();
    const attachments = req.files.map(file => ({ filename: file.filename, path: file.path }));
    const emailContent = `New Form Submission:
    Name: ${name}
    ID: ${idNumber}
    Phone: ${phone}
    Email: ${email}
    Manufacturer: ${manufacturer}
    Model: ${model}
    Loan: ${loan}
    Service Choice: ${serviceChoice}
    Files: ${files.join(', ')}`;

    await sendEmail('gegenavanika675@gmail.com', 'New Form Submission', emailContent, attachments);
    res.status(200).json({ message: 'Form data uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving form data' });
  }
});

app.use(express.static(path.join(__dirname, 'uploads')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads'));
});

app.post('/login', cors(corsOptions), (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    res.json({ success: true });
  });
});

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB', err);
});

const vacancySchema = new mongoose.Schema({
  title: String,
  description: String,
  applyLink: String,
});

const Vacancy = mongoose.model('Vacancy', vacancySchema);

app.get('/api/vacancies',cors(corsOptions), async (req, res) => {
  try {
    const vacancies = await Vacancy.find();
    res.json(vacancies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vacancies' });
  }
});

app.post('/api/vacancies',cors(corsOptions), async (req, res) => {
  const { title, description, applyLink } = req.body;
  const newVacancy = new Vacancy({ title, description, applyLink });
  try {
    await newVacancy.save();
    res.status(201).json(newVacancy);
  } catch (error) {
    res.status(400).json({ error: 'Error adding vacancy' });
  }
});

app.put('/api/vacancies/:id', cors(corsOptions),async (req, res) => {
  const id = req.params.id;
  const { title, description, applyLink } = req.body;
  try {
    const updatedVacancy = await Vacancy.findByIdAndUpdate(id, { title, description, applyLink }, { new: true });
    res.json(updatedVacancy);
  } catch (error) {
    res.status(400).json({ error: 'Error updating vacancy' });
  }
});

app.delete('/api/vacancies/:id', cors(corsOptions),async (req, res) => {
  const id = req.params.id;
  try {
    await Vacancy.findByIdAndDelete(id);
    res.status(200).json({ message: 'Vacancy deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting vacancy' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
