import { APIGatewayEventRequestContext, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import Path from 'path';
import { DownloaderHelper } from 'node-downloader-helper';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const fileExtensionPattern = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim;

function errorHandler(fileDestination: string, error: any) {
    console.log(error);

    fs.unlink(fileDestination, () => ({
        statusCode: 500,
        body: JSON.stringify({
            message: 'ERROR ON SAVE FILE OPERATION',
            reason: error,
        }),
    }));
}

const allowedExtensions = ['.png', '.jpeg', '.jpg', '.giph'];

export const lambdaHandler = async (
    event: APIGatewayProxyEvent,
    context: APIGatewayEventRequestContext,
): Promise<APIGatewayProxyResult> => {
    // TODO: RETRIEVE DATA FROM BODY OBJECT
    const secret_name = 'prod/extradite-lambda';

    if (!event.queryStringParameters?.assetUrl) {
        // https://res.cloudinary.com/dkfptto8m/image/upload/v1645390535/plant_placeholder.png
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Asset URL to extract missing!',
            }),
        };
    }

    const client = new SecretsManagerClient({
        region: 'us-east-1',
    });

    try {
        const url: string = event.queryStringParameters.assetUrl;

        const downloader = new DownloaderHelper(url, '/tmp/', {
            fileName: (name) => {
                // @ts-ignore
                const recognizedExtension = allowedExtensions.includes(name?.match(fileExtensionPattern))[0];
                if (!recognizedExtension) return `${name}.png`;

                return name;
            },
            resumeIfFileExists: true,
        });

        downloader.on('end', async (info) => {
            try {
                const secretString = await client.send(
                    new GetSecretValueCommand({
                        SecretId: secret_name,
                    }),
                );

                const secret = JSON.parse(secretString?.SecretString || '');

                cloudinary.config({
                    cloud_name: secret?.CLOUDINARY_CLOUD,
                    api_key: secret?.CLOUDINARY_API_KEY,
                    api_secret: secret?.CLOUDINARY_API_SECRET,
                    secure: true,
                });

                await cloudinary.uploader.upload(Path.join('/tmp/', info.fileName), {
                    use_filename: true,
                });

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Upload succesful',
                    }),
                };
            } catch (error) {
                console.log('FETCH ERROR:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        message: 'UNABLE TO FETCH TARGET ASSET',
                        reason: error,
                    }),
                };
            }
        });

        downloader.on('error', (err) => console.log('Download Failed', err));
        downloader.start().catch((err) => console.error(err));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Upload succesful',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'ERROR ON REQUEST',
                reason: err,
            }),
        };
    }
};
