sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox"

], function (Controller, JSONModel, BusyIndicator, MessageBox) {
    "use strict";

    return Controller.extend("com.extension.porequest.controller.InvoiceCreate", {
        onInit: function () {

            this.getView().addStyleClass("sapUiSizeCompact");

            this.router = sap.ui.core.UIComponent.getRouterFor(this);
            this.router.attachRouteMatched(this.handleRouteMatched, this);

            this.DataModel = new sap.ui.model.json.JSONModel();
            this.DataModel.setSizeLimit(100000000);
            this.getView().setModel(this.DataModel, "DataModel");
            this.detailModel = new JSONModel([]);
            this.getView().setModel(this.detailModel, "detailModel");

            this.getView().byId("InvoiceCreateTable").setSticky(["ColumnHeaders", "HeaderToolbar"]);
        },
        handleRouteMatched: function (event) {
            var oUploadSet = this.byId("attachment");
            oUploadSet.removeAllItems();
            this.byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
            this.getView().getModel("detailModel").setData([]);
        },
        onInvoiceTypeChange: function (evt) {
            const email = evt.getParameter("selectedItem").getBindingContext().getProperty("ApproverEmail");
            this.getView().getModel("DataModel").getData().Approver = email;
            this.getView().getModel("DataModel").refresh(true);
        },
        onAddItems: function (evt) {
            var data = this.getView().getModel("detailModel").getData();
            data.push({
                "MatCode": "",
                "MatDesc": "",
                "UOM": "",
                "Rate": "",
                "Qty": "",
                "BaseAmt": "",
                "IGST": "",
                "CGST": "",
                "SGST":""
            })
            this.getView().getModel("detailModel").refresh(true);
        },
        onCreatePress: function (evt) {
            if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "invType"]) && this.byId("attachment").getIncompleteItems().length > 0) {
                BusyIndicator.show();
                const payload = this.getView().getModel("DataModel").getData();
                setTimeout(() => {
                    this.getView().getModel().create("/PoList", payload, {
                        success: async (sData) => {
                            this.toAddress = sData.Approver;
                            this.invNo = sData.InvoiceNumber;
                            this.id = sData.Id;
                            await this.onInvItemSave();
                            this.doAttachment();
                        },
                        error: () => {
                             BusyIndicator.hide();
                        }
                    });
                }, 500);
            } else {
                MessageBox.error("Please fill all required inputs to proceed");
            }
        },
        /*
        onInvItemSave: async function () {
            BusyIndicator.show();
            var data = this.getView().getModel("detailModel").getData();
            for (var i = 0; i < data.length; i++) {
                data[i].PoList_Id = this.id;
                data[i].PoList_InvoiceNumber = this.invNo;
                this.getView().getModel().create("/PoListItems", data[i], {
                    success: function() {
                    },
                    error: function(oError) {
                        BusyIndicator.hide()
                        var error = JSON.parse(oError.response.body);
                        MessageBox.error(error.error.message.value);
                    }
                });
            }
        },
        */

        onInvItemSave: async function () {
            BusyIndicator.show();
            var data = this.getView().getModel("detailModel").getData();
        
            try {
                for (var i = 0; i < data.length; i++) {
                    data[i].PoList_Id = this.id;
                    data[i].PoList_InvoiceNumber = this.invNo;
                    await this.createPoListItem(data[i]);
                }
            } catch (error) {
                BusyIndicator.hide();
                var errorMsg = error.responseJSON ? error.responseJSON.error.message.value : "Error occurred while saving PoListItems.";
                MessageBox.error(errorMsg);
                throw error;
            }
        
            // All items created successfully
            BusyIndicator.hide();
        },
        
        createPoListItem: function (itemData) {
            return new Promise((resolve, reject) => {
                this.getView().getModel().create("/PoListItems", itemData, {
                    success: resolve,
                    error: reject
                });
            });
        },
        
        validateReqFields: function (fields) {
            let check = [], control, val;
            fields.forEach(inp => {
                control = this.byId(inp);
                val = control.getMetadata().getName() === 'sap.m.Select' ? control.getSelectedKey() : control.getValue();
                if (val === "") {
                    control.setValueState("Error").setValueStateText("Required");
                    check.push(false);
                } else {
                    control.setValueState("None");
                    check.push(true);
                }
            });
            if (check.every(item => item === true)) return true;
            else return false;
        },
        doAttachment: function () {
            this.items = this.byId("attachment").getIncompleteItems();
            this.byId("attachment").uploadItem(this.items[0]);
            this.items.splice(0, 1);
        },

        onAttachItemAdd: function (evt) {
            evt.getParameter("item").setVisibleEdit(false).setVisibleRemove(false);
        },

        onBeforeUploadStarts: function (evt) {
            evt.getParameter("item").addHeaderField(new sap.ui.core.Item({
                key: "slug",
                text: this.id + "/" + evt.getParameter("item").getFileName()
            }));
        },

        onUploadComplete: function () {
            if (this.byId("attachment").getIncompleteItems().length === 0) {
                BusyIndicator.hide();
                MessageBox.success("Invoice " + this.invNo + " uploaded successfully", {
                    onClose: () => {
                        const content = "Invoice " + this.invNo + " uploaded by supplier " + sap.ui.getCore().loginEmail.split("@")[0] + ".";
                        this.sendEmailNotification(content);
                        this.getView().getModel("DataModel").setData({});
                        this.getView().getModel("detailModel").setData([]);
                        this.onNavBack();
                    }
                });
            } else {
                this.byId("attachment").uploadItem(this.items[0]);
                this.items.splice(0, 1);
            }
        },

        onAttachmentUploadComplete: function () {
            if (this.byId("attachment").getIncompleteItems().length > 0) {
                this.byId("attachment").uploadItem(this.items[0]);
                this.items.splice(0, 1);
            }
        },
        sendEmailNotification: function (body) {
            const link = window.location.origin +
                "site/SP#porequest-manage?sap-ui-app-id-hint=saas_approuter_com.extension.porequest";
            return new Promise((resolve, reject) => {
                const emailBody = `|| ${body} Kindly log-in with the link to take your action.<br><br><a href='${link}'>CLICK HERE</a>`,
                    oModel = this.getView().getModel(),
                    mParameters = {
                        method: "GET",
                        urlParameters: {
                            content: emailBody,
                            toAddress: this.toAddress
                        },
                        success: function (oData) {
                            console.log("Email sent successfully.");
                            resolve(oData);
                        },
                        error: function (oError) {
                            console.log("Failed to send email.");
                            reject(oError);
                        }
                    };
                oModel.callFunction("/sendEmail", mParameters);
            });
        },
        onQuantityChange: function (e) {
            const val = e.getParameter("newValue");
            var path = e.getSource().getParent().getBindingContextPath().split("/")[1];
            var data = this.detailModel.getData();
            data[path].Qty = val;
            if(data[path].Rate){
            data[path].BaseAmt = parseFloat(data[path].Qty) * parseFloat(data[path].Rate);
            }
            this.detailModel.refresh(true);
        },
        onRateChange: function (e) {
            const val = e.getParameter("newValue");
            var path = e.getSource().getParent().getBindingContextPath().split("/")[1];
            var data = this.detailModel.getData();
            data[path].Rate = val;
            if(data[path].Qty){
            data[path].BaseAmt = parseFloat(data[path].Qty) * parseFloat(data[path].Rate);
            }
            this.detailModel.refresh(true);
        },
        // onGSTChange: function (e) {
        //     const val = e.getParameter("newValue");
        //     var path = e.getSource().getParent().getBindingContextPath().split("/")[1];
        //     var data = this.detailModel.getData();
        //     data[path].Rate = val;
        //     if(data[path].BaseAmt){
        //     data[path].TotalInvoiceAmount = parseFloat(data[path].Qty) * parseFloat(data[path].Rate);
        //     }
        //     this.detailModel.refresh(true);
        // },
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
