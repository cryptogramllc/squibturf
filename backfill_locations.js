const AWS = require('aws-sdk');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' }); // Set your region

const TABLE_NAME = 'local-squibs';

async function fetchLocationMetadata(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch location metadata');
    const data = await response.json();
    return {
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state,
        country: data.address.country,
    };
}

async function updateMissingLocations() {
    let ExclusiveStartKey = undefined;
    let updatedCount = 0;

    do {
        const params = {
            TableName: TABLE_NAME,
            ExclusiveStartKey,
        };
        const data = await docClient.scan(params).promise();

        for (const item of data.Items) {
            if (item.lat && item.lon && !item.location) {
                try {
                    const location = await fetchLocationMetadata(item.lat, item.lon);
                    const updateParams = {
                        TableName: TABLE_NAME,
                        Key: { uuid: item.uuid },
                        UpdateExpression: 'set #location = :location',
                        ExpressionAttributeNames: { '#location': 'location' },
                        ExpressionAttributeValues: { ':location': location },
                    };
                    await docClient.update(updateParams).promise();
                    updatedCount++;
                    console.log(`Updated ${item.uuid} with location:`, location);
                } catch (e) {
                    console.warn(`Failed to update ${item.uuid}:`, e.message);
                }
            }
        }

        ExclusiveStartKey = data.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    console.log(`Done! Updated ${updatedCount} items.`);
}

updateMissingLocations().catch(console.error); 