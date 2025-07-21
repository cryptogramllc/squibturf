const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const TABLE_NAME = 'local-squibs';
const TARGET_LON = -81.58;
const TARGET_LAT = 28.22;

async function checkSquibs() {
  console.log('🔍 Checking squibs in database...');
  console.log(`📍 Target location: ${TARGET_LON}, ${TARGET_LAT}`);
  console.log('---');

  try {
    // Scan the table for squibs at the target location
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: '#lon = :lon AND #lat = :lat',
      ExpressionAttributeNames: {
        '#lon': 'lon',
        '#lat': 'lat',
      },
      ExpressionAttributeValues: {
        ':lon': TARGET_LON.toFixed(2),
        ':lat': TARGET_LAT.toFixed(2),
      },
    };

    const result = await docClient.scan(params).promise();

    console.log(
      `📊 Found ${result.Items.length} squibs at the target location`
    );
    console.log('---');

    if (result.Items.length > 0) {
      // Sort by date_key (newest first)
      const sortedSquibs = result.Items.sort(
        (a, b) => (b.date_key || 0) - (a.date_key || 0)
      );

      console.log('📝 All squibs:');
      sortedSquibs.forEach((squib, index) => {
        console.log(`${index + 1}. "${squib.text}"`);
        console.log(`   User: ${squib.user_name}`);
        console.log(`   Date: ${squib.time_stamp}`);
        console.log(`   Type: ${squib.type}`);
        console.log(`   Image: ${squib.image ? squib.image[0] : 'None'}`);
        console.log(
          `   Location: ${squib.location?.city || 'N/A'}, ${
            squib.location?.state || 'N/A'
          }`
        );
        console.log(`   UUID: ${squib.uuid}`);
        console.log('---');
      });

      // Count by type
      const photoCount = result.Items.filter(s => s.type === 'photo').length;
      const textCount = result.Items.filter(s => s.type === 'text').length;

      console.log('📈 Summary:');
      console.log(`   Photos: ${photoCount}`);
      console.log(`   Text-only: ${textCount}`);
      console.log(`   Total: ${result.Items.length}`);
    } else {
      console.log('❌ No squibs found at the target location');
    }
  } catch (error) {
    console.error('❌ Error checking squibs:', error);
  }
}

// Run the verification
checkSquibs()
  .then(() => {
    console.log('✅ Check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
