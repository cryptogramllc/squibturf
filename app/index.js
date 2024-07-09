const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const { extractTitleAndFormatText, dateStamp, formattedDate } = require("./helpers");
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3();

exports.email = async function (event, context) {
    const {
        name,
        email,
        message
    } = event;
    // Set region
    AWS.config.update({ region: 'us-east-1' });
    // Create publish parameters
    var params = {
        Message: `New Message from ${name} <${email}>: 
            "${message}"`, /* required */
        TopicArn: 'arn:aws:sns:us-east-1:514188170070:Contact-Us'
    };
    const response = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
    if (!response.error) {
        return {
            statusCode: 200,
            body: { status: 'OK', messageId: response.MessageId },
        }
    }

};

exports.getBlogPost = async (event) => {
    const uuid = event.pathParameters.uuid;

    const params = {
        TableName: process.env.TABLE_NAME,
        Key: { uuid },
    };

    try {
        const data = await docClient.get(params).promise();

        if (!data.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Item not found' }),
            };
        }

        const formattedItem = {
            ...data.Item,
            date: await formattedDate(data.Item.date), // Assuming 'date' is the attribute to be formatted
        };
        console.log("🚀 ~ file: index.js:49 ~ exports.getBlogPost= ~ formattedItem:", formattedItem)


        return {
            statusCode: 200,
            body: JSON.stringify(formattedItem),
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    } catch (err) {
        console.log("🚀 ~ file: index.js:66 ~ exports.getBlogPost= ~ err:", err)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    }
};

exports.getBlogList = async (event) => {

    try {
        const params = {
            TableName: process.env.TABLE_NAME, // Replace with your DynamoDB table name
        };
        const data = await docClient.scan(params).promise();
        const sortItemsAsync = async (items) => {
            return items.sort((a, b) => {
                return parseInt(b.date) - parseInt(a.date);
            });
        };

        // Usage:
        const sortedItems = await sortItemsAsync(data.Items);
        // Sort and map the items asynchronously
        const sortedAndMappedData = await Promise.all(
            sortedItems.map(async (item) => {
                const timestamp = item.date;
                const date = await formattedDate(item.date);
                return {
                    ...item,
                    date,
                    timestamp,
                };
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(sortedAndMappedData),
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    } catch (error) {
        console.log("🚀 ~ file: index.js:101 ~ exports.getBlogList= ~ error:", error)
        return {
            statusCode: 500,
            body: JSON.stringify({ error, msg: 'Could not retrieve data from DynamoDB' }),
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    }
};

exports.createBlogItem = async (event) => {
    async function fetchImagesBySubject(subject) {
        try {
            const accessKey = process.env.UNSPLASH_ACCESS_KEY;
            const apiUrl = `https://api.unsplash.com/search/photos?query=${subject}&per_page=1&client_id=${accessKey}`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            // Use Promise.all to map image URLs asynchronously
            const imageUrls = await Promise.all(
                data.results.map(async (image) => image.urls.regular)
            );
            return imageUrls;
        } catch (error) {
            console.error(error);
            return [];
        }
    }


    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid HTTP method. Expected POST.' }),
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
                },
            };
        }
        const requestBody = JSON.parse(event.body);
        if (!requestBody.prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing "prompt" field in JSON data.' }),
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
                },
            };
        }

        const { prompt, subject, title } = requestBody;
        // const topics = formatArrayToString(items);

        // Replace with your ChatGPT API endpoint
        const url = process.env.OPENAI_URL;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        // Define your request headers
        const headers = {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
        };
        const data = JSON.stringify({ "model": "gpt-3.5-turbo", "messages": [{ "role": "user", "content": prompt }], "temperature": 1.0 });

        const response = await axios.post(url, data, { headers });

        if (response.status === 200) {
            const blogContent = response.data.choices[0].message.content;
            const item = extractTitleAndFormatText(blogContent);
            item.title = title ? title : item.title;
            item.uuid = uuidv4();
            item.date = dateStamp();
            const imageArray = await fetchImagesBySubject(subject);
            // Store the blog content in DynamoDB
            item.image = imageArray[0]
            const params = {
                TableName: process.env.TABLE_NAME,
                Item: item,
            };

            await docClient.put(params).promise();


            return {
                statusCode: 200,
                body: 'Blog post generated and stored in DynamoDB',
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
                },
            };
        } else {
            return {
                statusCode: response.status,
                body: 'Error: Failed to generate blog post',
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
                },
            };
        }
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.', error }),
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    }
}

exports.writeBlogItemsToHtml = async (event) => {
    const tableName = process.env.TABLE_NAME;
    const s3Bucket = process.env.S3_BUCKET;
    const templateHtmlKey = 'blog/template.html'; // e.g., 'template.html'
    try {
        // Read the HTML template from S3
        const templateData = await s3.getObject({ Bucket: s3Bucket, Key: templateHtmlKey }).promise();
        const templateHtml = templateData.Body.toString('utf-8');

        // Query DynamoDB for entries
        const params = { TableName: tableName };
        const dynamoResponse = await docClient.scan(params).promise();
        for (const item of dynamoResponse.Items) {
            const timestamp = typeof item.date === 'string' ? parseInt(item.date) : item.date;
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            // Create HTML content by replacing placeholders in the template
            const htmlContent = templateHtml
                .replace('{{ title }}', item.title)
                .replace('{{ date }}', `${month} • ${day} • ${year}`)
                .replace('{{ content }}', item.content)
                .replace('{{ image }}', `<image class="blog-image" src="${item.image ? item.image : 'https://unsplash.com/photos/black-and-silver-laptop-computer-on-table-95YRwf6CNw8'}" />`);

            // Set the S3 object key based on the date timestamp
            const titleInDash = item.title.toLowerCase().replace(/\s/g, '-').replace(/-$/, '');
            const s3Key = `article/${year}/${month}/${day}/${titleInDash}/index.html`;
            const link = s3Key.replace('/index.html', '/');
            // Update the DynamoDB item with the s3Key
            const updateParams = {
                TableName: tableName,
                Key: { uuid: item.uuid },
                UpdateExpression: 'SET link = :link',
                ExpressionAttributeValues: {
                    ':link': link,
                },
            };

            await docClient.update(updateParams).promise();

            const s3Params = {
                Bucket: s3Bucket,
                Key: s3Key,
                Body: htmlContent,
                ContentType: 'text/html',
            };
            await s3.upload(s3Params).promise();
        }

        return {
            statusCode: 200,
            body: 'HTML files generated and uploaded to S3 successfully!',
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'Error generating HTML and uploading to S3',
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow requests from any origin
            },
        };
    }
}
