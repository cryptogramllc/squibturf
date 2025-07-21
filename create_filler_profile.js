const AWS = require('aws-sdk');
const fetch = (...args) =>
  import('node-fetch').then(mod => mod.default(...args));
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// AWS Configuration
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const s3 = new AWS.S3({ region: 'us-east-1' });

const TABLE_NAME = 'users';
const S3_BUCKET = 'squibturf-images';

// Random profile data
const PROFILE_DATA = {
  givenName: 'Alex',
  familyName: 'Thompson',
  displayName: 'alex_thompson',
  email: 'alex.thompson@example.com',
  bio: 'Adventure seeker and coffee enthusiast ☕ | Always exploring new places and meeting amazing people 🌍 | Photography lover 📸 | Living life one squib at a time ✨',
  name: 'Alex Thompson',
};

// Function to get random profile picture
async function getRandomProfilePicture() {
  try {
    // Use Lorem Picsum for profile pictures - smaller size for profile pics
    const imageIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ];
    const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
    const url = `https://picsum.photos/id/${randomId}/300/300`;

    // Test the URL
    const response = await fetch(url, {
      redirect: 'follow',
      timeout: 10000,
    });

    if (!response.ok) throw new Error('Failed to fetch image');

    return url;
  } catch (error) {
    console.error('Error fetching profile picture:', error);
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

// Function to create filler profile
async function createFillerProfile() {
  try {
    console.log('👤 Creating filler profile...');

    // Generate UUID for the user
    const uuid = uuidv4();

    // Get random profile picture
    const imageUrl = await getRandomProfilePicture();
    let photoUrl = null;

    if (imageUrl) {
      const imageFileName = `profile-${uuid}-${Date.now()}.jpg`;
      const tempImagePath = path.join('/tmp', imageFileName);

      // Download image
      await downloadImage(imageUrl, tempImagePath);

      // Upload to S3
      photoUrl = await uploadToS3(tempImagePath, imageFileName);

      // Clean up temp file
      fs.unlinkSync(tempImagePath);
    }

    // Create user profile data
    const userData = {
      uuid: uuid,
      email: PROFILE_DATA.email.toLowerCase(),
      givenName: PROFILE_DATA.givenName,
      familyName: PROFILE_DATA.familyName,
      displayName: PROFILE_DATA.displayName,
      name: PROFILE_DATA.name,
      bio: PROFILE_DATA.bio,
      photo: photoUrl,
      profileCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Write to DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: userData,
    };

    await docClient.put(params).promise();

    console.log('✅ Filler profile created successfully!');
    console.log('---');
    console.log('📋 Profile Details:');
    console.log(`   UUID: ${uuid}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Full Name: ${userData.name}`);
    console.log(`   Display Name: ${userData.displayName}`);
    console.log(`   Bio: ${userData.bio}`);
    if (photoUrl) {
      console.log(`   Profile Picture: ${photoUrl}`);
    } else {
      console.log(`   Profile Picture: None (failed to upload)`);
    }
    console.log(`   Profile Completed: ${userData.profileCompleted}`);
    console.log('---');

    return userData;
  } catch (error) {
    console.error('❌ Error creating filler profile:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createFillerProfile()
    .then(() => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createFillerProfile };
