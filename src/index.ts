import * as core from '@actions/core';
import { DescribeUpdateCommand, EKSClient, UpdateClusterConfigCommand } from '@aws-sdk/client-eks';
import * as dotenv from 'dotenv';
// Amol Chavan
dotenv.config();

async function run() {
    try {
        const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || core.getInput('aws_access_key_id');
        const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || core.getInput('aws_secret_access_key');
        const region = process.env.REGION || core.getInput('region');
        const clusterName = process.env.CLUSTER_NAME || core.getInput('cluster_name');
        const publicAccess = (process.env.PUBLIC_ACCESS === 'true') || core.getInput('public_access') === 'true';
        // Configure AWS SDK v3
        const client = new EKSClient({
            region,
            credentials: {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            },
        });

        // Update the EKS cluster endpoint access
        const params = {
            name: clusterName,
            resourcesVpcConfig: {
                endpointPublicAccess: publicAccess,
            },
        };

        const updateClusterConfigCommand = new UpdateClusterConfigCommand(params);
        const updateClusterConfig = await client.send(updateClusterConfigCommand);

        if (!updateClusterConfig || !updateClusterConfig.update || !updateClusterConfig.update.id) {
            throw new Error('Failed to initiate the update of EKS cluster endpoint access');
        }

        // Polling for the status update
        let status = updateClusterConfig.update.status;
        const updateId = updateClusterConfig.update.id;
        const pollingFrequency = 30000; // 30 seconds

        while (status === 'InProgress') {
            core.info(`Waiting for status change... Polling again in ${pollingFrequency / 1000} seconds`);
            await new Promise((resolve) => setTimeout(resolve, pollingFrequency)); // Wait for 30 seconds

            const describeUpdateCommand = new DescribeUpdateCommand({
                name: clusterName,
                updateId: updateId,
            });

            const describeUpdate = await client.send(describeUpdateCommand);

            if (!describeUpdate || !describeUpdate.update) {
                throw new Error('Failed to fetch the update status of EKS cluster endpoint access');
            }

            status = describeUpdate.update.status;
        }

        if (status === 'Failed') {
            throw new Error('Failed to update EKS cluster endpoint access');
        }

        core.info(`Successfully updated EKS cluster endpoint access to ${publicAccess ? 'public' : 'private'}`);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unknown error occurred');
        }
    }
}

run();
