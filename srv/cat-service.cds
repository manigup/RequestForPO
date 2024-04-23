using db.porequest as my from '../db/data-model';

type MaterialList {
    UnitCode            : String;
    MaterialCode        : String;
    MaterialDescription : String;
    MaterialNumber      : String;
    UOM                 : String;
    HSNCode             : String;
    MaterialGroup       : String;
}

type PoList {
    UnitCode           : String;
    AddressCode        : String;
    AddressDescription : String;
    BalanceQuantity    : String;
    TrnType            : String;
    TrnCode            : String;
    TRNDate            : String;
    TrnRefNumber       : String;
    ItemCode           : String;
    ItemRevNumber      : String;
    ItemQuantity       : String;
}

service CatalogService {

    entity PoList      as
        projection on my.PoList
        excluding {
            createdAt,
            modifiedAt,
            modifiedBy
        };

    entity PoListItems as
        projection on my.PoListItems
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

    function sendEmail(content : String, toAddress : String)                                 returns String;
    function getMaterialList(UnitCode : String, ItemCode : String, ItemDescription : String) returns array of MaterialList;
    function getPoList(unitCode : String, addressCode : String)                              returns array of PoList;

}
