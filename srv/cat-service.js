const cds = require('@sap/cds');
const axios = require('axios').default;
const FormData = require('form-data');

const sdmCredentials = {
    "clientid": "sb-af5ed0ac-6872-41a0-956e-ec2fea18c139!b26649|sdm-di-DocumentManagement-sdm_integration!b247",
    "clientsecret": "vORif9806WxSm8azpmw6Fuj99Ro=",
    "url": "https://impautosuppdev.authentication.ap10.hana.ondemand.com",
    "ecmserviceurl": "https://api-sdm-di.cfapps.ap10.hana.ondemand.com/",
    "repositoryId": "PO_Request"
}

module.exports = cds.service.impl(async function () {

    this.before('READ', 'PoList', async (req) => {

        let userID = req.user.id;
        if (userID === "anonymous") {
            userID = "samarnahak@kpmg.com";
        }

        const records = await cds.run(cds.parse.cql("Select * from db.porequest.PoList"));

        if (records.findIndex(item => item.Status === "PWP" && item.Approver === userID) !== -1) {
            req.query.where(`Approver = '${userID}' and Status = 'PWP'`);
        } else if (req.headers.logintype === "P") {
            req.query.where(`createdBy = '${userID}'`);
        } else {
            req.reject(404, "No data available");
        }
    });

    this.before('UPDATE', 'PoList', async (req) => {

        if (req.data.Action === "A") {

            const records = await cds.run(cds.parse.cql("Select PONumber from db.porequest.PoList")),
                duplicatePo = records.filter(item => item.PONumber === req.data.PONumber);

            if (duplicatePo.length > 0) {
                req.reject(400, 'Duplicate po number');
            }
            req.data.Status = "ABP" // approved by purchase

        } else if (req.data.Action === "E") {
            req.data.Status = "PWP" // pending with purchase

            const { PoListItems } = cds.entities("db.porequest");
            let sInsertQuery = UPSERT.into(PoListItems).entries(req.data.Items);
            await cds.tx(req).run(sInsertQuery).catch((err) => console.log(err.message));
        } else {
            req.data.Status = "RBP" // rejected by purchase
        }
    });

    this.before('CREATE', 'PoList', async (req) => {

        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }

        const records = await cds.run(cds.parse.cql("Select InvoiceNumber from db.porequest.PoList")),
            duplicateInvNo = records.filter(item => item.InvoiceNumber === req.data.InvoiceNumber);

        if (duplicateInvNo.length > 0) {
            req.reject(400, 'Duplicate invoice number');
        }

        req.data.Status = "PWP"; // pending with purchase
        req.data.Id = Math.random().toString().substr(2, 6);

        const connJwtToken = await _fetchJwtToken(sdmCredentials.url, sdmCredentials.clientid, sdmCredentials.clientsecret);

        // Creating dms folder
        await _createFolder(sdmCredentials.ecmserviceurl, connJwtToken, sdmCredentials.repositoryId, req.data.Id);
    });

    this.before("CREATE", 'Attachments', async (req) => {

        const reqData = req.data.Filename.split("/");

        const connJwtToken = await _fetchJwtToken(sdmCredentials.url, sdmCredentials.clientid, sdmCredentials.clientsecret);

        req.data.ObjectId = await _uploadAttachment(sdmCredentials.ecmserviceurl, connJwtToken, sdmCredentials.repositoryId, reqData[0], reqData[1]);

        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }
        req.data.Id = reqData[0];
        req.data.Filename = reqData[1];
    });

    this.on('sendEmail', async (req) => {
        const { content, toAddress } = req.data;

        const payload = {
            Subject: "Request for PO",
            Content: `Dear ${toAddress.split("@")[0]}, ${content} | | Regards | ImperialAuto`,
            Seperator: "|",
            ToAddress: toAddress,
            CCAddress: "",
            BCCAddress: "",
            CreatedBy: "Manikandan"
        };
        try {
            const legApi = await cds.connect.to('Legacy'),
                response = await legApi.send({
                    query: `POST SendMail`,
                    headers: {
                        'Authorization': 'Bearer IncMpsaotdlKHYyyfGiVDg==',
                        'Content-Type': 'application/json'
                    },
                    data: payload
                });
            if (response.ErrorCode) {
                return "Error sending email";
            } else {
                return "Email sent successfully";
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    this.on('getMaterialList', async (req) => {
        const { UnitCode, ItemCode, ItemDescription } = req.data;
        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }
        return fetchMaterialList(UnitCode, ItemCode, ItemDescription, req.user.id)
    });

    this.on('getPoList', async (req) => {
        const { unitCode, addressCode } = req.data;
        if (req.user.id === "anonymous") {
            req.user.id = "samarnahak@kpmg.com";
        }
        return fetchPoList(unitCode, addressCode, req.user.id)
    });
});

async function fetchPoList(unitCode, addressCode, userId) {
    try {
        const token = await generateToken(userId),
            legApi = await cds.connect.to('Legacy'),
            response = await legApi.send({
                query: `GET GetPOPSList?RequestBy='${userId}'&UnitCode='${unitCode}'&AddressCode='${addressCode}'`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

        if (response.d) {
            return JSON.parse(response.d);
        } else {
            console.error('Error parsing response:', response.data);
            throw new Error('Error parsing the response from the API.');
        }
    } catch (error) {
        console.error('Error in GetPOPSList API call:', error);
        throw new Error('Unable to fetch PO List:', error);
    }
}

async function fetchMaterialList(UnitCode, ItemCode, ItemDescription, userId) {
    try {
        const token = await generateToken(userId),
            legApi = await cds.connect.to('Legacy'),
            response = await legApi.send({
                query: `GET GetMaterialList?RequestBy='${userId}'&UnitCode='${UnitCode}'&ItemCode='${ItemCode}'&ItemDescription='${ItemDescription}'`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

        if (response.d) {
            return JSON.parse(response.d);
        } else {
            console.error('Error parsing response:', response.data);
            throw new Error('Error parsing the response from the API.');
        }
    } catch (error) {
        console.error('Error in getMaterialList API call:', error);
        throw new Error('Unable to fetch Material List:', error);
    }
}

const _fetchJwtToken = async function (oauthUrl, oauthClient, oauthSecret) {

    return new Promise((resolve, reject) => {
        const tokenUrl = oauthUrl + '/oauth/token?grant_type=client_credentials&response_type=token'
        const config = {
            headers: {
                Authorization: "Basic " + Buffer.from(oauthClient + ':' + oauthSecret).toString("base64")
            }
        }
        axios.get(tokenUrl, config)
            .then(response => {
                resolve(response.data.access_token)
            })
            .catch(error => {
                reject(error)
            })
    })
}

// create a new folder for every invoice upload & add their respective attachments in that folder
const _createFolder = async function (sdmUrl, jwtToken, repositoryId, folderName) {
    return new Promise((resolve, reject) => {
        const folderCreateURL = sdmUrl + "browser/" + repositoryId + "/root";

        const formData = new FormData();
        formData.append("cmisaction", "createFolder");
        formData.append("propertyId[0]", "cmis:name");
        formData.append("propertyValue[0]", folderName);
        formData.append("propertyId[1]", "cmis:objectTypeId");
        formData.append("propertyValue[1]", "cmis:folder");
        formData.append("succinct", 'true');

        let headers = formData.getHeaders();
        headers["Authorization"] = "Bearer " + jwtToken;

        const config = {
            headers: headers
        }

        axios.post(folderCreateURL, formData, config)
            .then(response => {
                resolve(response.data.succinctProperties["cmis:objectId"])
            })
            .catch(error => {
                reject(error)
            })
    })
}

const _uploadAttachment = async function (sdmUrl, jwtToken, repositoryId, folderName, fileName) {
    return new Promise((resolve, reject) => {
        const url = sdmUrl + "browser/" + repositoryId + "/root/" + folderName;

        const formData = new FormData();
        formData.append("cmisaction", "createDocument");
        formData.append("propertyId[0]", "cmis:name");
        formData.append("propertyValue[0]", fileName);
        formData.append("propertyId[1]", "cmis:objectTypeId");
        formData.append("propertyValue[1]", "cmis:document");
        formData.append("succinct", 'true');
        formData.append("filename", fileName);
        formData.append("media", 'binary');

        let headers = formData.getHeaders();
        headers["Authorization"] = "Bearer " + jwtToken;

        const config = {
            headers: headers
        }

        axios.post(url, formData, config)
            .then(response => {
                resolve(response.data.succinctProperties["cmis:objectId"])
            })
            .catch(error => {
                reject(error)
            })
    })
}

async function generateToken(username) {
    try {
        const legApi = await cds.connect.to('Legacy'),
            response = await legApi.send({
                query: `POST GenerateToken`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    "InputKey": username
                }
            });

        if (response.d) {
            return response.d;
        } else {
            console.error('Error parsing token response:', response.data);
            throw new Error('Error parsing the token response from the API.');
        }
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error('Unable to generate token.');
    }
}

