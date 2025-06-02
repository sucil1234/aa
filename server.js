const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors'); // Required for Cross-Origin Resource Sharing

const app = express();
const port = process.env.PORT || 3000; // Use environment port (e.g., for deployment) or default to 3000

// Middleware to parse JSON request bodies (for POST, PUT requests)
app.use(express.json());

// CORS Middleware: Allows your client app (even running on a different port or 'file://' origin)
// to make requests to this server.
app.use(cors({
    origin: '*' // Allow all origins for development. IMPORTANT: In production, replace '*' with your actual client URL (e.g., 'https://your-dee-why-gems-app.com').
}));

let db; // Variable to hold the database connection object

// Function to connect to MongoDB Atlas
async function connectDB() {
  // IMPORTANT: REPLACE THIS PLACEHOLDER WITH YOUR ACTUAL MongoDB ATLAS CONNECTION STRING
  const uri = process.env.MONGODB_URI; 
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    db = client.db('dee_why_gems_db'); // You can change the database name here if you prefer
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas', error);
    process.exit(1); // Exit the process if database connection fails critically
  }
}

connectDB(); // Call the function to connect to the database when the server starts

// --- API Endpoints ---

// 1. Root endpoint: Simple response to check if server is running
app.get('/', (req, res) => {
  res.send('Dee Why Hidden Gems API is running!');
});

// 2. GET all hidden gems
// URL: /api/gems
app.get('/api/gems', async (req, res) => {
  try {
    const gems = await db.collection('hidden_gems').find().toArray();
    res.json(gems);
  } catch (error) {
    console.error('Error fetching all gems:', error);
    res.status(500).json({ message: 'Failed to fetch hidden gems' });
  }
});

// 3. GET a single hidden gem by ID
// URL: /api/gems/:id
app.get('/api/gems/:id', async (req, res) => {
    const gemId = req.params.id; // Get the ID from the URL parameters
    try {
        // Validate if the provided ID string is a valid MongoDB ObjectId format
        if (!ObjectId.isValid(gemId)) {
            return res.status(400).json({ message: 'Invalid Gem ID format' });
        }
        // Find a single document by its _id
        const gem = await db.collection('hidden_gems').findOne({ _id: new ObjectId(gemId) });
        if (!gem) {
            return res.status(404).json({ message: 'Hidden gem not found' });
        }
        res.json(gem); // Send the found gem as JSON response
    } catch (error) {
        console.error('Error fetching single gem:', error);
        res.status(500).json({ message: 'Failed to fetch hidden gem' });
    }
});

// 4. POST a new hidden gem
// URL: /api/gems
app.post('/api/gems', async (req, res) => {
  const newGem = req.body; // Data for the new gem comes from the request body
  // Basic server-side validation for essential fields
  if (!newGem.title || !newGem.description || !newGem.category) {
      return res.status(400).json({ message: 'Missing required gem fields (title, description, category)' });
  }

  // Automatically add a submission date/timestamp to the gem
  newGem.submissionDate = new Date();

  try {
    const result = await db.collection('hidden_gems').insertOne(newGem);
    // Respond with success message, the inserted ID, and the complete new gem object
    res.status(201).json({ message: 'Hidden gem added successfully', insertedId: result.insertedId, newGem: newGem });
  } catch (error) {
    console.error('Error adding gem:', error);
    res.status(500).json({ message: 'Failed to add hidden gem' });
  }
});

// 5. PUT (Update) an existing hidden gem by ID
// URL: /api/gems/:id
app.put('/api/gems/:id', async (req, res) => {
    const gemId = req.params.id; // Get the ID from the URL parameters
    const updatedGem = req.body; // Updated data comes from the request body

    try {
        // Validate ID format
        if (!ObjectId.isValid(gemId)) {
            return res.status(400).json({ message: 'Invalid Gem ID format' });
        }

        // It's good practice to prevent the _id from being modified, as it's immutable
        delete updatedGem._id; // Ensure _id is not part of the $set operation

        const result = await db.collection('hidden_gems').updateOne(
            { _id: new ObjectId(gemId) }, // Filter: find the document by its unique _id
            { $set: updatedGem }         // Update operation: set the new fields from updatedGem
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Hidden gem not found' });
        }
        if (result.modifiedCount === 0) {
            // If matchedCount > 0 but modifiedCount is 0, it means the document was found
            // but the new data was identical to the existing data, so no actual modification occurred.
            return res.status(200).json({ message: 'No changes made to the hidden gem (data was identical)' });
        }
        res.status(200).json({ message: 'Hidden gem updated successfully' });
    } catch (error) {
        console.error('Error updating gem:', error);
        res.status(500).json({ message: 'Failed to update hidden gem' });
    }
});


// 6. DELETE a hidden gem by ID
// URL: /api/gems/:id
app.delete('/api/gems/:id', async (req, res) => {
    const gemId = req.params.id; // Get the ID from the URL parameters
    try {
        // Validate ID format
        if (!ObjectId.isValid(gemId)) {
            return res.status(400).json({ message: 'Invalid Gem ID format' });
        }
        // Perform the delete operation
        const result = await db.collection('hidden_gems').deleteOne({ _id: new ObjectId(gemId) });

        if (result.deletedCount === 0) {
            // If deletedCount is 0, it means no document matched the provided ID for deletion
            return res.status(404).json({ message: 'Hidden gem not found or already deleted' });
        }
        res.status(200).json({ message: 'Hidden gem deleted successfully' });
    } catch (error) {
        console.error('Error deleting gem:', error);
        res.status(500).json({ message: 'Failed to delete hidden gem' });
    }
});


// Start the Express server and listen for incoming requests
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});