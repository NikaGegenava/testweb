const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const uri = "mongodb+srv://gegenavanika675:nikagegena123123@mydata.regmol3.mongodb.net/?appName=MyData";

const app = express();
const PORT = process.env.PORT || 5000;

const hashedPassword = bcrypt.hashSync('admin', 10);
const users = [
  { id: 1, username: 'admin', password: hashedPassword }
];

app.use(cors());
app.use(bodyParser.json());

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const fs = require('fs');
const dir = './uploads';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

app.post('/submit', upload.single('cv'), async (req, res) => {
  const { firstName, lastName, idNumber, dob, location, email, number } = req.body;
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
    res.status(200).send('Form submitted successfully!');
  } catch (err) {
    res.status(500).send('Error saving to database.');
  }
});

app.use(express.static(path.join(__dirname, 'uploads')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'uploads'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login request received:', username, password);

  const user = users.find(u => u.username === username);

  if (!user) {
    console.log('User not found:', username);
    return res.status(404).json({ error: 'User not found' });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      console.log('Authentication failed:', username);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    console.log('Authentication successful for:', username);
    res.json({ success: true });
  });
});

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const vacancySchema = new mongoose.Schema({
  title: String,
  description: String,
  applyLink: String,
});

const Vacancy = mongoose.model('Vacancy', vacancySchema);

app.get('/api/vacancies', async (req, res) => {
  try {
    const vacancies = await Vacancy.find();
    res.json(vacancies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vacancies' });
  }
});

app.post('/api/vacancies', async (req, res) => {
  const { title, description, applyLink } = req.body;
  const newVacancy = new Vacancy({ title, description, applyLink });
  try {
    await newVacancy.save();
    res.status(201).json(newVacancy);
  } catch (error) {
    res.status(400).json({ error: 'Error adding vacancy' });
  }
});

app.put('/api/vacancies/:id', async (req, res) => {
  const id = req.params.id;
  const { title, description, applyLink } = req.body;
  try {
    const updatedVacancy = await Vacancy.findByIdAndUpdate(id, { title, description, applyLink }, { new: true });
    res.json(updatedVacancy);
  } catch (error) {
    res.status(400).json({ error: 'Error updating vacancy' });
  }
});

app.delete('/api/vacancies/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await Vacancy.findByIdAndDelete(id);
    res.status(200).json({ message: 'Vacancy deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting vacancy' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
