const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Helper function to create API Gateway response
const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

const storeUser = async userData => {
  const params = {
    TableName: 'users',
    Item: userData,
  };
  try {
    await dynamoDb.send(new PutCommand(params));
    return createResponse(200, 'Successfully processed login');
  } catch (err) {
    throw err;
  }
};

const updateUser = async userData => {
  // Build update expression dynamically based on provided fields
  const updateFields = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Fields that can be updated
  const updatableFields = [
    'familyName',
    'givenName',
    'displayName',
    'bio',
    'name',
    'photo',
    'profileCompleted',
  ];

  updatableFields.forEach(field => {
    if (userData[field] !== undefined) {
      updateFields.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = userData[field];
    }
  });

  if (updateFields.length === 0) {
    return createResponse(200, 'No fields to update');
  }

  const params = {
    TableName: 'users',
    Key: { email: userData.email.toLowerCase() },
    UpdateExpression: `SET ${updateFields.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDb.send(new UpdateCommand(params));
    return createResponse(200, result.Attributes);
  } catch (err) {
    throw err;
  }
};

const isProfileComplete = userData => {
  // Check if user has the minimum required profile information
  return userData.familyName && userData.givenName && userData.displayName;
};

exports.handler = async event => {
  console.log('Lambda event:', JSON.stringify(event, null, 2));

  try {
    // Handle OPTIONS requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    // Handle GET requests (fetch profile by UUID)
    if (event.httpMethod === 'GET') {
      const { uuid } = event.pathParameters || {};

      if (!uuid) {
        return createResponse(400, { message: 'UUID is required' });
      }

      console.log('Fetching profile for UUID:', uuid);

      // Use UUID to find the user - scan with filter since UUID might not be a GSI
      const params = {
        TableName: 'users',
        FilterExpression: '#uuid = :uuid',
        ExpressionAttributeNames: {
          '#uuid': 'uuid',
        },
        ExpressionAttributeValues: {
          ':uuid': uuid,
        },
      };

      try {
        const response = await dynamoDb.send(new ScanCommand(params));
        const users = response.Items;

        console.log('DynamoDB scan result:', JSON.stringify(response, null, 2));

        if (!users || users.length === 0) {
          return createResponse(404, { message: 'User not found' });
        }

        const user = users[0]; // Get the first (and should be only) user
        console.log('Found user:', JSON.stringify(user, null, 2));

        return createResponse(200, user);
      } catch (error) {
        console.error('Error scanning user by UUID:', error);
        return createResponse(500, { message: 'Error fetching user profile' });
      }
    }

    // Handle POST requests (create/update user)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email } = body;

      if (!email) {
        return createResponse(400, { message: 'Email is required' });
      }

      const params = {
        TableName: 'users',
        Key: { email: email.toLowerCase() },
      };

      // Check if user already exists
      const response = await dynamoDb.send(new GetCommand(params));
      const existingUser = response.Item;

      if (!existingUser) {
        // New user - create and check if profile completion is needed
        await storeUser(body);

        const needsProfileCompletion = !isProfileComplete(body);
        const userData = {
          ...body,
          needsProfileCompletion,
        };
        return createResponse(200, userData);
      } else {
        // Existing user - check if profile completion is needed

        const needsProfileCompletion = !isProfileComplete(existingUser);

        // If this is a profile update (has profileCompleted flag), update the user
        if (body.profileCompleted) {
          const updateResult = await updateUser(body);
          const updatedUser = JSON.parse(updateResult.body);

          return createResponse(200, {
            ...updatedUser,
            needsProfileCompletion: false, // Profile is now complete
          });
        }

        // Return existing user with profile completion status
        const userData = {
          ...existingUser,
          needsProfileCompletion,
        };

        return createResponse(200, userData);
      }
    }

    return createResponse(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error('Lambda error:', err);
    return createResponse(500, { message: 'Internal server error' });
  }
};
