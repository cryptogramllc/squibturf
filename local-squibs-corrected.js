const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  ScanCommand,
  DynamoDBDocumentClient,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async event => {
  console.log('=== LOCAL SQUIBS LAMBDA (SORT AND PAGINATE APPROACH) ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  const { lon, lat, lastKey, limit = 10, page = 0 } = event;

  console.log('lastKey provided:', !!lastKey);
  console.log('Using limit:', limit);
  console.log('Page:', page);
  console.log('Original coordinates:', { lon, lat });

  try {
    // Parse coordinates to numbers
    const lonNum = parseFloat(lon);
    const latNum = parseFloat(lat);
    console.log('Parsed coordinates:', { lonNum, latNum });

    // Get ALL items for this location
    const scanParams = {
      TableName: 'local-squibs',
      FilterExpression: '#lon = :lon AND #lat = :lat',
      ExpressionAttributeNames: {
        '#lon': 'lon',
        '#lat': 'lat',
      },
      ExpressionAttributeValues: {
        ':lon': lon,
        ':lat': lat,
      },
    };

    // If this is a cache request (high limit), get all items without pagination
    if (limit >= 1000) {
      console.log(
        'Cache request detected - fetching all items without pagination'
      );

      const dbResp = await docClient.send(new ScanCommand(scanParams));
      console.log(
        'Raw DynamoDB response - Items count:',
        dbResp.Items ? dbResp.Items.length : 0
      );

      // Process items and ensure date_key is set
      const processedItems = dbResp.Items.map(item => {
        // Ensure date_key exists
        if (!item.date_key) {
          item.date_key = item.time_stamp
            ? new Date(item.time_stamp).getTime()
            : Date.now();
        }
        return item;
      });

      // Sort by date_key in descending order (newest first)
      const allSortedItems = processedItems.sort(
        (a, b) => (b.date_key || 0) - (a.date_key || 0)
      );

      console.log('=== CACHE RESPONSE ===');
      console.log('Total items for location:', allSortedItems.length);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({
          Items: allSortedItems,
          LastEvaluatedKey: null,
          TotalItems: allSortedItems.length,
          CurrentPage: 0,
        }),
      };
    }

    console.log('Scan params:', JSON.stringify(scanParams, null, 2));

    const dbResp = await docClient.send(new ScanCommand(scanParams));

    console.log(
      'Raw DynamoDB response - Items count:',
      dbResp.Items ? dbResp.Items.length : 0
    );

    // Process items and ensure date_key is set
    const processedItems = dbResp.Items.map(item => {
      // Ensure date_key exists
      if (!item.date_key) {
        item.date_key = item.time_stamp
          ? new Date(item.time_stamp).getTime()
          : Date.now();
      }
      return item;
    });

    // Sort by date_key in descending order (newest first)
    const allSortedItems = processedItems.sort(
      (a, b) => (b.date_key || 0) - (a.date_key || 0)
    );

    // Return specific page of sorted items
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const pageItems = allSortedItems.slice(startIndex, endIndex);

    console.log('=== FINAL RESPONSE ===');
    console.log('Total items for location:', allSortedItems.length);
    console.log('Items returned:', pageItems.length);
    console.log('Has more pages:', allSortedItems.length > endIndex);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        Items: pageItems,
        LastEvaluatedKey:
          allSortedItems.length > endIndex
            ? { page: page + 1, totalItems: allSortedItems.length }
            : null,
        TotalItems: allSortedItems.length,
        CurrentPage: page,
      }),
    };
  } catch (error) {
    console.error('Error in Lambda function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
    };
  }
};
