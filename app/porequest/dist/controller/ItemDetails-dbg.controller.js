sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox"

], function (Controller, JSONModel, BusyIndicator, MessageBox) {
    "use strict";

    return Controller.extend("com.extension.porequest.controller.ItemDetails", {
        onInit: function () {

            this.getView().addStyleClass("sapUiSizeCompact");

            this.router = sap.ui.core.UIComponent.getRouterFor(this);
			this.router.attachRouteMatched(this._handleRouteMatched, this);

			this.itemModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(this.itemModel, "itemModel");
        },
        _handleRouteMatched: function (evt) {
			var that = this;
			if (evt.getParameter("name") !== "ItemDetails") {
				return;
			}
            BusyIndicator.show();
            this.id = evt.getParameter("arguments").Id;
			this.Inv_Num = evt.getParameter("arguments").Inv_Num;
            var filters = [
                new sap.ui.model.Filter("PoList_Id", sap.ui.model.FilterOperator.EQ, this.id),
                new sap.ui.model.Filter("PoList_InvoiceNumber", sap.ui.model.FilterOperator.EQ, this.Inv_Num)
            ];
            var combinedFilter = new sap.ui.model.Filter({
                filters: filters,
                and: true // using AND to combine filters
            });
            this.getView().getModel().read("/PoListItems", {
                filters: [combinedFilter],
                success: data => {
                    this.getView().getModel("itemModel").setData(data.results);
                    this.getView().getModel("itemModel").refresh(true);
                    BusyIndicator.hide();
                },
                error: () => BusyIndicator.hide()
            });
		},
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
    
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("Upload", {}, true);
            }
    
        },
    });

});
