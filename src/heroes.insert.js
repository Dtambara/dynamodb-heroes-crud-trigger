const uuid = require('uuid');
const Joi = require('@hapi/joi');
const decoratorValidator = require('./util/decoratorValidator');
const globalEnum = require('./util/globalEnum')

class Handler {
    constructor({ dynamoDBSvc }) {
        this.dynamoDBSvc = dynamoDBSvc,
        this.dynamodbTable = process.env.DYNAMODB_TABLE
    };

    static validator() {
        return Joi.object({
            nome: Joi.string().max(100).min(2).required(),
            poder: Joi.string().max(20).required()
        })
    }

    prepareData(data) {
        const params = {
            TableName: this.dynamodbTable,
            Item: {
                ...data,
                id: uuid.v1(),
                createdAt: new Date().toISOString()
            }
        }
        return params;
    }

    async insertItem(params) {
        const result = this.dynamoDBSvc.put(params).promise();
        return result;
    }

    handlerSuccess(data) {
        const response = {
            statusCode: 200,
            body: JSON.stringify(data)
        }

        return response;
    }

    handlerError(data) {
        return {
            statusCode: data.statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Couldn\'t create item!'
        }
    }

    async main(event) {
        try {
            const data = event.body;
            const params = this.prepareData(data);
            await this.insertItem(params);
            return this.handlerSuccess(params.Item);
        } catch (error) {
            console.error('Erro: ', error)
            return this.handlerError({ statusCode: 500 })
        }
    };
}

//factory
const AWS = require( 'aws-sdk' );
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const handler = new Handler({
    dynamoDBSvc: dynamoDB
});
module.exports = decoratorValidator(
    handler.main.bind(handler),
    Handler.validator(),
    globalEnum.ARG_TYPE.BODY);