import AWSS3 from 'aws-sdk/clients/s3'

/** Bucket that holds finished zips/tracks (only used when SPLIT_TRACK_STORAGE is not 'local'). */
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME ?? ''

const s3 = new AWSS3({
    apiVersion: '2006-03-01',
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

export default s3
