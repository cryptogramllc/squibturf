const AWS = require('aws-sdk');
const fetch = (...args) =>
  import('node-fetch').then(mod => mod.default(...args));
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// AWS Configuration
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const s3 = new AWS.S3({ region: 'us-east-1' });

const TABLE_NAME = 'local-squibs';
const S3_BUCKET = 'squibturf-images';

// Target coordinates
const TARGET_LON = -81.58;
const TARGET_LAT = 28.22;

// Random squib texts
const SQUIB_TEXTS = [
  'Just discovered this amazing spot! 🌟',
  'Perfect day for exploring the city! 🏙️',
  'Found this hidden gem today! 💎',
  'The vibes here are absolutely incredible! ✨',
  "Can't believe I've never been here before! 🤯",
];

// Random user names
const USER_NAMES = [
  'Alex Johnson',
  'Sarah Williams',
  'Michael Brown',
  'Emily Davis',
  'David Miller',
];

// Function to get random image using a reliable service
async function getRandomImage() {
  try {
    // Use Lorem Picsum with specific IDs for reliable images
    const imageIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ];
    const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
    const url = `https://picsum.photos/id/${randomId}/800/600`;

    // Test the URL
    const response = await fetch(url, {
      redirect: 'follow',
      timeout: 10000,
    });

    if (!response.ok) throw new Error('Failed to fetch image');

    return url;
  } catch (error) {
    console.error('Error fetching random image:', error);
    return null;
  }
}

// Function to download image using fetch API
async function downloadImage(url, filename) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(buffer));
    return filename;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Function to upload image to S3
async function uploadToS3(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: fileContent,
    ContentType: 'image/jpeg',
    ACL: 'public-read',
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

// Function to fetch location metadata
async function fetchLocationMetadata(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch location metadata');
    const data = await response.json();

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      'Orlando';
    const state = data.address.state || 'Florida';
    const country = data.address.country || 'United States';

    return {
      city: city,
      state: state,
      country: country,
    };
  } catch (error) {
    console.warn('Failed to fetch location metadata:', error.message);
    return {
      city: 'Orlando',
      state: 'Florida',
      country: 'United States',
    };
  }
}

// Function to create a single squib
async function createSquib(index) {
  try {
    console.log(`Creating squib ${index + 1}...`);

    // Generate random data
    const text = SQUIB_TEXTS[index]; // Use different text for each squib
    const userName = USER_NAMES[index]; // Use different user for each squib
    const userId = uuidv4();

    // Get random image
    const imageUrl = await getRandomImage();
    if (!imageUrl) {
      throw new Error('Failed to get image URL');
    }

    const imageFileName = `squib-${index + 1}-${Date.now()}.jpg`;
    const tempImagePath = path.join('/tmp', imageFileName);

    // Download image
    await downloadImage(imageUrl, tempImagePath);

    // Upload to S3
    const s3Url = await uploadToS3(tempImagePath, imageFileName);

    // Clean up temp file
    fs.unlinkSync(tempImagePath);

    // Get location metadata
    const location = await fetchLocationMetadata(TARGET_LAT, TARGET_LON);

    // Create squib data
    const squibData = {
      text: text,
      lon: TARGET_LON.toFixed(2),
      lat: TARGET_LAT.toFixed(2),
      uuid: uuidv4(),
      image: [imageFileName],
      user_id: userId,
      user_name: userName,
      time_stamp: moment()
        .subtract(Math.floor(Math.random() * 7), 'days')
        .format('MMM DD YYYY h:mm A'),
      date_key:
        Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000, // Random date within last 7 days
      location: location,
      type: 'photo',
    };

    // Write to DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: squibData,
    };

    await docClient.put(params).promise();

    console.log(`✅ Squib ${index + 1} created successfully!`);
    console.log(`   Text: ${text}`);
    console.log(`   User: ${userName}`);
    console.log(`   Image: ${s3Url}`);
    console.log(`   Location: ${location.city}, ${location.state}`);
    console.log('---');

    return squibData;
  } catch (error) {
    console.error(`❌ Error creating squib ${index + 1}:`, error.message);
    throw error;
  }
}

// Main function to create 5 squibs
async function createFiveSquibs() {
  console.log('🚀 Creating 5 squibs with images...');
  console.log(`📍 Target location: ${TARGET_LON}, ${TARGET_LAT}`);
  console.log('---');

  const createdSquibs = [];

  for (let i = 0; i < 5; i++) {
    try {
      const squib = await createSquib(i);
      createdSquibs.push(squib);

      // Add a small delay between requests
      if (i < 4) {
        // Don't delay after the last one
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to create squib ${i + 1}, continuing...`);
    }
  }

  console.log(
    `🎉 Successfully created ${createdSquibs.length} out of 5 squibs!`
  );
  console.log(
    `📊 Success rate: ${((createdSquibs.length / 5) * 100).toFixed(1)}%`
  );

  return createdSquibs;
}

// Run the script
if (require.main === module) {
  createFiveSquibs()
    .then(() => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createFiveSquibs, createSquib };
