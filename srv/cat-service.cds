using db.porequest as my from '../db/data-model';

service CatalogService {

    entity PoList      as
        projection on my.PoList
        excluding {
            createdAt,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity InvoiceType as projection on my.InvoiceType;

    entity Attachments @(restrict: [{grant: [
        'READ',
        'WRITE',
    ]}])               as
        projection on my.Attachments
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    function sendEmail(content : String, toAddress : String) returns String;
}
