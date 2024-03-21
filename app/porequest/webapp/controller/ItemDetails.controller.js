sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.extension.porequest.controller.ItemDetails", {

        onInit: function () {
            this.router = sap.ui.core.UIComponent.getRouterFor(this);
            this.router.attachRouteMatched(this._handleRouteMatched, this);

            this.getView().setModel(new JSONModel({}), "HeaderModel");
            this.getView().setModel(new JSONModel([]), "ItemModel");
        },

        _handleRouteMatched: function (evt) {
            if (evt.getParameter("name") !== "ItemDetails") {
                return;
            }
            const id = evt.getParameter("arguments").Id,
                invNum = evt.getParameter("arguments").Inv_Num;

            this.getView().getModel().read("/PoList(Id='" + id + "',InvoiceNumber='" + invNum + "')", {
                success: data => {
                    this.getView().getModel("HeaderModel").setData(data);
                    this.getView().getModel("HeaderModel").refresh(true);
                    this.getView().getModel().read("/PoList(Id='" + id + "',InvoiceNumber='" + invNum + "')/Items", {
                        success: sdata => {
                            this.getView().getModel("ItemModel").setData(sdata.results);
                            this.getView().getModel("ItemModel").refresh(true);
                            this.byId("title").setText("Items (" + sdata.results.length + ")");
                        }
                    });
                }
            });
        },

        onNavBack: function () {
            const oHistory = sap.ui.core.routing.History.getInstance(),
                sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.router.navTo("Upload");
            }
        }
    });

});
