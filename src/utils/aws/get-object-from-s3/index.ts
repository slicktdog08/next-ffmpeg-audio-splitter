import { GetObjectRequest, GetObjectOutput } from 'aws-sdk/clients/s3'
import s3 from '..'

export const getObjectFromS3: (params: GetObjectRequest) => Promise<GetObjectOutput> = (params) =>
    new Promise(async (resolve, reject) => {
        s3.getObject(params, (error, data) => {
            if (error) {
                console.error(`Enconuntered error while reading file from S3. ${error?.message}`)
                return reject(error?.message)
            }
            return resolve(data)
        })
    })
