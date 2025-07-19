const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const storeUser = async userData => {
  const params = {
    TableName: 'users',
    Item: userData,
  };
  try {
    await dynamoDb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify('Successfully processed login'),
    };
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
    return { statusCode: 200, body: JSON.stringify('No fields to update') };
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
    const result = await dynamoDb.update(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Attributes) };
  } catch (err) {
    throw err;
  }
};

const isProfileComplete = userData => {
  // Check if user has the minimum required profile information
  return userData.familyName && userData.givenName && userData.displayName;
};

exports.handler = async event => {

  try {
    const { email } = event;
    if (!email) {
      throw new Error('Email is required');
    }

    const params = {
      TableName: 'users',
      Key: { email: email.toLowerCase() },
    };

    // Check if user already exists
    const response = await dynamoDb.get(params).promise();
    const existingUser = response.Item;

    if (!existingUser) {
      // New user - create and check if profile completion is needed
      await storeUser(event);

      const needsProfileCompletion = !isProfileComplete(event);
      const userData = {
        ...event,
        needsProfileCompletion,
      };

        'New user created, needs profile completion:',
        needsProfileCompletion
      );
      return userData;
    } else {
      // Existing user - check if profile completion is needed

      const needsProfileCompletion = !isProfileComplete(existingUser);

      // If this is a profile update (has profileCompleted flag), update the user
      if (event.profileCompleted) {
        const updateResult = await updateUser(event);
        const updatedUser = JSON.parse(updateResult.body);

        return {
          ...updatedUser,
          needsProfileCompletion: false, // Profile is now complete
        };
      }

      // Return existing user with profile completion status
      const userData = {
        ...existingUser,
        needsProfileCompletion,
      };

        'Returning existing user, needs profile completion:',
        needsProfileCompletion
      );
      return userData;
    }
  } catch (err) {
    throw err;
  }
};
