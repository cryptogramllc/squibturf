const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
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

const deleteUser = async email => {
  try {
    // First, get the user to find their UUID
    const getUserParams = {
      TableName: 'users',
      Key: { email: email.toLowerCase() },
    };

    const userResponse = await dynamoDb.send(new GetCommand(getUserParams));
    const user = userResponse.Item;

    if (!user) {
      return createResponse(404, { message: 'User not found' });
    }

    const userId = user.uuid;
    console.log('Found user with UUID:', userId);

    // Delete all squibs belonging to this user
    console.log('Deleting user squibs...');
    const deleteSquibsParams = {
      TableName: 'local-squibs',
      FilterExpression: '#user_id = :user_id',
      ExpressionAttributeNames: {
        '#user_id': 'user_id',
      },
      ExpressionAttributeValues: {
        ':user_id': userId,
      },
    };

    // Scan to find all squibs by this user
    const squibsResponse = await dynamoDb.send(
      new ScanCommand(deleteSquibsParams)
    );
    const userSquibs = squibsResponse.Items || [];

    console.log(
      `Found ${userSquibs.length} squibs to delete for user ${userId}`
    );

    // Delete each squib
    if (userSquibs.length > 0) {
      const deletePromises = userSquibs.map(squib => {
        const deleteSquibParams = {
          TableName: 'local-squibs',
          Key: { uuid: squib.uuid },
        };
        return dynamoDb.send(new DeleteCommand(deleteSquibParams));
      });

      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${userSquibs.length} squibs`);
    }

    // Finally, delete the user
    console.log('Deleting user account...');
    const deleteUserParams = {
      TableName: 'users',
      Key: { email: email.toLowerCase() },
    };

    await dynamoDb.send(new DeleteCommand(deleteUserParams));
    console.log('Successfully deleted user account');

    return createResponse(200, {
      message: 'Account deleted successfully',
      deletedSquibs: userSquibs.length,
      userId: userId,
    });
  } catch (err) {
    console.error('Error in deleteUser:', err);
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
    // Check if this is an API Gateway event (AWS_PROXY) or direct body (AWS)
    const isApiGatewayEvent = event.httpMethod !== undefined;

    if (isApiGatewayEvent) {
      // Handle API Gateway event (AWS_PROXY integration)
      console.log('Processing API Gateway event');

      // Handle OPTIONS requests for CORS
      if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, {});
      }

      // Handle DELETE requests (delete user account)
      if (event.httpMethod === 'DELETE') {
        const body = JSON.parse(event.body || '{}');
        const { email } = body;

        if (!email) {
          return createResponse(400, {
            message: 'Email is required for account deletion',
          });
        }

        console.log('Deleting account for email:', email);

        try {
          const result = await deleteUser(email);
          console.log('Account deletion result:', result);
          return result;
        } catch (error) {
          console.error('Error deleting user account:', error);
          return createResponse(500, { message: 'Error deleting account' });
        }
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

          console.log(
            'DynamoDB scan result:',
            JSON.stringify(response, null, 2)
          );

          if (!users || users.length === 0) {
            return createResponse(404, { message: 'User not found' });
          }

          const user = users[0]; // Get the first (and should be only) user
          console.log('Found user:', JSON.stringify(user, null, 2));

          return createResponse(200, user);
        } catch (error) {
          console.error('Error scanning user by UUID:', error);
          return createResponse(500, {
            message: 'Error fetching user profile',
          });
        }
      }

      // Handle POST requests (create/update user)
      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const { email } = body;

        if (!email) {
          return createResponse(400, { message: 'Email is required' });
        }

        console.log('Processing user data:', JSON.stringify(body, null, 2));

        try {
          // Check if user exists
          const existingUserParams = {
            TableName: 'users',
            Key: { email: email.toLowerCase() },
          };

          const existingUserResponse = await dynamoDb.send(
            new GetCommand(existingUserParams)
          );

          if (existingUserResponse.Item) {
            // User exists, update
            console.log('Updating existing user');
            const result = await updateUser(body);
            return result;
          } else {
            // User doesn't exist, create new
            console.log('Creating new user');
            const result = await storeUser(body);
            return result;
          }
        } catch (error) {
          console.error('Error processing user:', error);
          return createResponse(500, { message: 'Error processing user data' });
        }
      }
    } else {
      // Handle direct body (AWS integration) - assume DELETE operation
      console.log('Processing direct body event (AWS integration)');

      const { email } = event;

      if (!email) {
        return createResponse(400, {
          message: 'Email is required for account deletion',
        });
      }

      console.log('Deleting account for email:', email);

      try {
        const result = await deleteUser(email);
        console.log('Account deletion result:', result);
        return result;
      } catch (error) {
        console.error('Error deleting user account:', error);
        return createResponse(500, { message: 'Error deleting account' });
      }
    }

    // If we get here, method not allowed
    return createResponse(405, { message: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return createResponse(500, { message: 'Internal server error' });
  }
};
