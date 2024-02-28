const { validateContact, Contact } = require("../models/Contact");
const auth = require("../middlewares/auth");
const csv = require('csv-parser');
const fs = require('fs');

const mongoose = require("mongoose");
const router = require("express").Router();

// Create contact.
router.post("/contact", auth, async (req, res) => {
  const { error } = validateContact(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, address, email, phone } = req.body;

  try {
    const newContact = new Contact({
      name,
      address,
      email,
      phone,
      postedBy: req.user._id,
    });
    const result = await newContact.save();

    return res.status(201).json({ ...result._doc });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Fetch contacts.
router.get("/mycontacts", auth, async (req, res) => {
  try {
    const myContacts = await Contact.find({ postedBy: req.user._id }).populate(
      "postedBy",
      "-password"
    );

    return res.status(200).json({ contacts: myContacts.reverse() });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Update contact.
router.put("/contact", auth, async (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ error: "no id specified." });
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: "please enter a valid id" });

  try {
    const contact = await Contact.findOne({ _id: id });

    if (req.user._id.toString() !== contact.postedBy._id.toString())
      return res
        .status(401)
        .json({ error: "you can't edit other people contacts!" });

    const updatedData = { ...req.body, id: undefined };
    const result = await Contact.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    return res.status(200).json({ ...result._doc });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Delete a contact.
router.delete("/delete/:id", auth, async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "no id specified." });

  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: "please enter a valid id" });
  try {
    const contact = await Contact.findOne({ _id: id });
    if (!contact) return res.status(400).json({ error: "no contact found" });

    if (req.user._id.toString() !== contact.postedBy._id.toString())
      return res
        .status(401)
        .json({ error: "you can't delete other people contacts!" });

    const result = await Contact.deleteOne({ _id: id });
    const myContacts = await Contact.find({ postedBy: req.user._id }).populate(
      "postedBy",
      "-password"
    );

    return res
      .status(200)
      .json({ ...contact._doc, myContacts: myContacts.reverse() });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Import contacts from CSV file.
router.post("/import", auth, async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "Error in file uploaded." });
    }

    const file = req.files.file;

    file.mv("./uploads/" + file.name, async (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Server Error" });
      }

      const results = [];
      fs.createReadStream("./uploads/" + file.name)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            await Contact.insertMany(results.map(contact => ({
              name: contact.name,
              address: contact.address,
              email: contact.email,
              phone: contact.phone,
              postedBy: req.user._id
            })));

            fs.unlinkSync("./uploads/" + file.name);

            return res.status(201).json({ message: "Contacts imported successfully" });
          } catch (err) {
            console.log(err);
            return res.status(500).json({ error: "Server Error" });
          }
        });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Export contacts to CSV file.
router.get("/export", auth, async (req, res) => {
  try {
    const myContacts = await Contact.find({ postedBy: req.user._id });

    const csvData = myContacts.map(contact => ({
      name: contact.name,
      address: contact.address,
      email: contact.email,
      phone: contact.phone
    }));

    const csvFields = ['name', 'address', 'email', 'phone'];

    const json2csv = require('json2csv').parse;
    const csv = json2csv(csvData, { fields: csvFields });

    res.header('Content-Type', 'text/csv');
    res.attachment('contacts.csv');
    return res.send(csv);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Mass delete contacts.
router.delete("/mass-delete", auth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid or missing IDs" });
    }

    await Contact.deleteMany({ _id: { $in: ids }, postedBy: req.user._id });

    return res.status(200).json({ message: "Contacts deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

// Get a single contact.
router.get("/contact/:id", auth, async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "no id specified." });

  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: "please enter a valid id" });

  try {
    const contact = await Contact.findOne({ _id: id });

    return res.status(200).json({ ...contact._doc });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
