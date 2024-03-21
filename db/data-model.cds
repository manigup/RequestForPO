namespace db.porequest;

using managed from '@sap/cds/common';

entity PoList : managed {
  key Id                 : String(6);
      InvoiceDate        : String(8);
  key InvoiceNumber      : String;
      TotalInvoiceAmount : Integer;
      InvoiceType        : String;
      GSTAmt             : Decimal;
      PONumber           : String;
      EwayBillNumber     : String default '';
      EwayBillDate       : String(8) default '';
      Approver           : String @(restrict: [{
        grant: ['WRITE'],
        where: 'CreatedBy = $user'
      }]);
      ApproverRemarks    : String default '';
      Action             : String(1) default '';
      Status             : String;
      Items              : Composition of many PoListItems
                             on Items.PoList = $self;
}

entity PoListItems : managed {
  key UUID      : UUID;
      MatCode   : String;
      MatDesc   : String;
      UOM       : String;
      Rate      : Decimal;
      Qty       : Integer;
      BaseAmt   : Decimal;
      IGST      : Decimal;
      IGSTAmt   : Decimal;
      CGST      : Decimal;
      CGSTAmt   : Decimal;
      SGST      : Decimal;
      SGSTAmt   : Decimal;
      LineValue : Decimal;
      HSNCode   : String;
      PoList    : Association to PoList
}

entity Attachments : managed {
  key Id        : String(6);
  key ObjectId  : String;

      @Core.MediaType: Mediatype
      Data      : LargeBinary @Core.ContentDisposition.Filename: Filename;

      Mediatype : String;

      @Core.IsMediaType
      Filename  : String;
}

entity InvoiceType {
  key Id            : Int16;
      Type          : String;
      ApproverEmail : String;
      ApproverName  : String;
};
