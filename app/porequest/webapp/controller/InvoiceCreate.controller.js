sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"

], function (Controller, JSONModel, BusyIndicator, Filter, MessageBox) {
    "use strict";

    return Controller.extend("com.extension.porequest.controller.InvoiceCreate", {

        onInit: function () {
            this.router = sap.ui.core.UIComponent.getRouterFor(this);
            this.router.attachRouteMatched(this.handleRouteMatched, this);

            this.getView().setModel(new JSONModel([]), "AttachmentModel");
            // this.getView().setModel(new JSONModel([]), "MaterialModel");

            this.byId("invCreateTable").setSticky(["ColumnHeaders", "HeaderToolbar"]);
        },

        handleRouteMatched: function (evt) {
            if (evt.getParameter("name") !== "InvoiceCreate") {
                return;
            }
            this.byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");

            this.id = evt.getParameter("arguments").Id;
            this.invNo = evt.getParameter("arguments").InvNum;

            if (this.id && this.invNo) {
                this.byId("invPage").setTitle("Edit Invoice - " + this.invNo);
                this.byId("createBtn").setVisible(false);
                this.byId("editBtn").setVisible(true);
                this.getView().getModel().read("/PoList(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')", {
                    success: data => {
                        this.getView().setModel(new JSONModel(data), "HeaderModel");
                        this.getView().getModel("HeaderModel").refresh(true);
                        this.getView().getModel().read("/PoList(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')/Items", {
                            success: sdata => {
                                this.getView().setModel(new JSONModel(sdata.results), "ItemModel");
                                this.getView().getModel("ItemModel").refresh(true);
                                this.getAttachments();
                            }
                        });
                    }
                });
            } else {
                this.byId("invPage").setTitle("Upload New Invoice");
                this.byId("createBtn").setVisible(true);
                this.byId("editBtn").setVisible(false);
                this.byId("attachment").removeAllIncompleteItems();
                this.getView().setModel(new JSONModel({}), "HeaderModel");
                this.getView().setModel(new JSONModel([]), "ItemModel");
            }

            // const unitCode = sessionStorage.getItem("unitCode") || "P01";
            // return new Promise((resolve, reject) => {
            //     const mParameters = {
            //         method: "GET",
            //         urlParameters: {
            //             UnitCode: unitCode
            //         },
            //         success: function (oData) {
            //             resolve(oData);
            //             debugger;
            //         },
            //         error: function (oError) {
            //             reject(oError);
            //         }
            //     };
            //     this.getView().getModel().callFunction("/getMaterialList", mParameters);
            // });
        },

        getAttachments: function () {
            this.getView().getModel().read("/Attachments", {
                filters: [new Filter("Id", "EQ", this.id)],
                success: data => {
                    this.getView().getModel("AttachmentModel").setData(data.results);
                    this.getView().getModel("AttachmentModel").refresh(true);
                }
            });
        },

        onInvoiceTypeChange: function (evt) {
            const email = evt.getParameter("selectedItem").getBindingContext().getProperty("ApproverEmail");
            this.getView().getModel("HeaderModel").getData().Approver = email;
            this.getView().getModel("HeaderModel").refresh(true);
        },

        onAddItems: function () {
            this.getView().getModel("ItemModel").getData().push({});
            this.getView().getModel("ItemModel").refresh(true);
        },

        onCreatePress: function () {
            if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "invType"]) && this.byId("attachment").getIncompleteItems().length > 0) {
                BusyIndicator.show();
                const payload = this.getView().getModel("HeaderModel").getData();
                setTimeout(() => {
                    this.getView().getModel().create("/PoList", payload, {
                        success: async (sData) => {
                            this.toAddress = sData.Approver;
                            this.invNo = sData.InvoiceNumber;
                            this.id = sData.Id;
                            await this.onInvItemSave();
                            this.doAttachment();
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 500);
            } else {
                MessageBox.error("Please fill all required inputs to proceed");
            }
        },

        onEditPress: function (evt) {
            this.dialogSource = evt.getSource();
            if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "invType"])) {
                BusyIndicator.show();
                const payload = this.getView().getModel("HeaderModel").getData();
                payload.Action = "E";
                payload.Items = this.getView().getModel("ItemModel").getData();
                setTimeout(() => {
                    this.getView().getModel().update("/PoList(InvoiceNumber='" + this.invNo + "',Id='" + this.id + "')", payload, {
                        success: () => {
                            this.toAddress = payload.Approver;
                            if (this.byId("attachment").getIncompleteItems().length > 0) {
                                this.doAttachment();
                            } else {
                                BusyIndicator.hide();
                                MessageBox.success("Invoice " + this.invNo + " updated successfully", {
                                    onClose: () => {
                                        this.sendEmailNotification("Invoice " + this.invNo + " updated by supplier " + sap.ui.getCore().loginEmail.split("@")[0] + ".");
                                        this.onNavBack();
                                    }
                                });
                            }
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 500);
            } else {
                MessageBox.error("Please fill all required inputs to proceed");
            }
        },

        onInvItemSave: async function () {
            BusyIndicator.show();
            var data = this.getView().getModel("ItemModel").getData();
            try {
                for (var i = 0; i < data.length; i++) {
                    data[i].InvoiceNumber_Id = this.id;
                    data[i].InvoiceNumber_InvoiceNumber = this.invNo;
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
                let content, sMsg;
                if (this.byId("invPage").getTitle().includes("Edit")) {
                    content = " updated by supplier ",
                        sMsg = " updated ";
                } else {
                    content = " uploaded by supplier ",
                        sMsg = " uploaded ";
                }
                MessageBox.success("Invoice " + this.invNo + sMsg + "successfully", {
                    onClose: () => {
                        this.sendEmailNotification("Invoice " + this.invNo + content + sap.ui.getCore().loginEmail.split("@")[0] + ".");
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
                "/site/SP#porequest-manage?sap-ui-app-id-hint=saas_approuter_com.extension.porequest";
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

        calcTotalVal: function () {
            let totalInvAmt = 0, totalGstAmt = 0;
            this.getView().getModel("ItemModel").getData().forEach(item => {
                totalInvAmt += parseFloat(item.LineValue) || 0;
                totalGstAmt += (parseFloat(item.IGSTAmt) || 0) + (parseFloat(item.CGSTAmt) || 0) + (parseFloat(item.SGSTAmt) || 0);
            });
            let data = this.getView().getModel("HeaderModel").getData();
            data.TotalInvoiceAmount = totalInvAmt.toFixed(2);
            data.GSTAmt = totalGstAmt.toFixed(2);
            this.getView().getModel("ItemModel").refresh(true);
            this.getView().getModel("HeaderModel").refresh(true);
        },

        onTaxCodeChange: function (evt) {
            const item = evt.getSource().getBindingContext("ItemModel").getObject();
            item.BaseAmt = parseFloat(item.Qty || 0) * parseFloat(item.Rate || 0);
            item.IGSTAmt = parseFloat((parseFloat(item.IGST) / 100 * item.BaseAmt).toFixed(2)) || 0;
            item.CGSTAmt = parseFloat((parseFloat(item.CGST) / 100 * item.BaseAmt).toFixed(2)) || 0;
            item.SGSTAmt = parseFloat((parseFloat(item.SGST) / 100 * item.BaseAmt).toFixed(2)) || 0;
            item.LineValue = parseFloat((item.BaseAmt + item.IGSTAmt + item.CGSTAmt + item.SGSTAmt).toFixed(2));
            this.calcTotalVal();
        },

        onRowDeletePress: function (evt) {
            const path = evt.getParameter("listItem").getBindingContext("ItemModel").getPath().split("/")[1];
            MessageBox.confirm("Are you sure ?", {
                actions: ["YES", "NO"],
                onClose: (action) => {
                    if (action === "YES") {
                        this.getView().getModel("ItemModel").getData().splice(path, 1);
                        this.calcTotalVal();
                    }
                },
            })
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
