sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, BusyIndicator, Filter, MessageBox) {
        "use strict";

        return Controller.extend("com.extension.porequest.controller.Upload", {

            onInit: function () {
                this.router = sap.ui.core.UIComponent.getRouterFor(this);
                this.tblTemp = this.byId("uploadTblTemp").clone();
                this.getView().setModel(new JSONModel({}), "Filter");
                this.getView().setModel(new JSONModel([]), "PoList");
            },

            onAfterRendering: function () {
                this.getData();
            },

            getData: function () {
                const filterData = this.getView().getModel("Filter").getData();
                let oFilters = [];
                Object.keys(filterData).forEach(key => {
                    if (!jQuery.isEmptyObject(filterData[key])) {
                        oFilters.push(new Filter(key, "EQ", filterData[key]));
                    }
                });
                this.byId("uploadTbl").bindAggregation("items", {
                    path: "/PoList",
                    filters: oFilters,
                    template: this.tblTemp
                });
            },

            onFilterClear: function () {
                this.getView().getModel("Filter").setData({});
                this.getView().getModel("Filter").refresh(true);
            },

            onItempress: function (evt) {
                const data = evt.getParameter("listItem").getBindingContext().getObject();
                this.router.navTo("ItemDetails", {
                    "Id": data.Id,
                    "Inv_Num": data.InvoiceNumber
                });
            },

            onAddPress: function () {
                this.router.navTo("InvoiceCreate");
            },

            onInvNoPress: function (evt) {
                const data = evt.getSource().getBindingContext().getObject();
                this.router.navTo("InvoiceCreate", {
                    "Id": data.Id,
                    "InvNum": data.InvoiceNumber
                });
            },

            onActionChange: function (evt) {
                const source = evt.getSource(),
                    selectedAction = source.getSelectedKey();
                this.actionEvt = evt.getSource();
                this.obj = source.getBindingContext().getObject();
                MessageBox.confirm("Are you sure ?", {
                    onClose: (action) => {
                        if (action === "YES") {
                            this.invNo = this.obj.InvoiceNumber;
                            this.id = this.obj.Id;
                            this.toAddress = this.obj.createdBy;
                            this.payload = { Action: selectedAction };

                            const remarksFrag = sap.ui.xmlfragment("com.extension.porequest.fragment.Remarks", this),
                                title = selectedAction === "A" ? "Approval" : "Rejection";
                            this.getView().addDependent(remarksFrag);
                            remarksFrag.setTitle(title);
                            remarksFrag.open();
                            this.getView().getModel("PoList").setData([]);
                            this.getView().getModel("PoList").refresh(true);

                            if (selectedAction === "A") {
                                sap.ui.getCore().byId("po").setVisible(true);
                                BusyIndicator.show();
                                // return new Promise((resolve, reject) => {
                                // this.getView().getModel().callFunction("/getPoList", {
                                //     method: "GET",
                                //     urlParameters: {
                                //         unitCode: obj.PurchaseCode,
                                //         addressCode: this.addressCode
                                //     },
                                //     success: function (oData) {
                                //         BusyIndicator.hide();
                                //         this.getView().getModel("PoList").setData(oData.results);
                                //         this.getView().getModel("PoList").refresh(true);
                                //         resolve();
                                //     }.bind(this),
                                //     error: function (oError) {
                                //         BusyIndicator.hide();
                                //         reject(oError);
                                //     }
                                // });
                                this.getView().getModel("po").read("/PurchaseOrders", {
                                    urlParameters: {
                                        "$expand": "DocumentRows",
                                        AddressCode: this.obj.AddressCode,
                                        UnitCode: this.obj.PlantCode
                                    },
                                    success: (oData) => {
                                        BusyIndicator.hide();
                                        const fData = oData.results.filter(item => item.HasAttachments !== "Invoice Submitted");
                                        if (fData.length > 0) {
                                            this.getView().getModel("PoList").setData(fData);
                                            this.getView().getModel("PoList").refresh(true);
                                        } else {
                                            MessageBox.error("Po List is Empty");
                                        }
                                    },
                                    error: (error) => {
                                        BusyIndicator.hide();
                                        MessageBox.error(JSON.parse(error.responseText).error.message.value);
                                    }
                                });
                                // });
                            } else {
                                sap.ui.getCore().byId("po").setVisible(false);
                            }
                        }
                    },
                    actions: ["YES", "NO"],
                });
            },

            onRemarksSubmit: function (evt) {
                this.dialogSource = evt.getSource();
                const reqFields = this.payload.Action === "A" ? ["po", "remarks"] : ["remarks"];
                if (this.validateReqFields(reqFields)) {
                    this.payload.ApproverRemarks = sap.ui.getCore().byId("remarks").getValue();
                    if (this.payload.Action === "A") {
                        this.payload.PONumber = sap.ui.getCore().byId("po").getSelectedKey();
                    }
                    this.takeAction();
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onDialogCancel: function (evt) {
                this.actionEvt.setSelectedKey();
                evt.getSource().getParent().destroy();
            },

            onPoNumberChange: function (evt) {
                BusyIndicator.show();
                this.poEntryPayload = evt.getParameter("selectedItem").getBindingContext("PoList").getObject();
                this.getView().getModel().read("/PoList(Id='" + this.obj.Id + "',InvoiceNumber='" + this.obj.InvoiceNumber + "')/Items", {
                    success: (oData) => {
                        this.obj.Items = oData.results[0];
                        BusyIndicator.hide();
                    },
                    error: (error) => {
                        BusyIndicator.hide();
                        MessageBox.error(JSON.parse(error.responseText).error.message.value);
                    }
                });
            },

            createPoEntry: function () {
                const payload = {
                    "PNum_PoNum": this.poEntryPayload.PoNum.replace(/\//g, '-'),
                    "PlantName": this.poEntryPayload.PlantName,
                    "PlantCode": this.poEntryPayload.PlantCode,
                    "BillDate": this.obj.InvoiceDate,
                    "BillNumber": this.obj.InvoiceNumber,
                    "EwayBillNumber": this.obj.EwayBillNumber,
                    "EwayBillDate": this.obj.EwayBillDate,
                    "TotalCGstAmnt": this.obj.Items.CGSTAmt,
                    "TotalSGstAmnt": this.obj.Items.SGSTAmt,
                    "TotalIGstAmnt": this.obj.Items.IGSTAmt,
                    "TotalAmnt": this.obj.TotalInvoiceAmount,
                };
                this.getView().getModel("po").create("/ASNListHeader", payload, {
                    success: () => {
                        let invListPayload = [];
                        const payData = JSON.stringify(this.poEntryPayload.DocumentRows.results.map(item => {
                            delete item.__metadata;
                            delete item.PNum;
                            item.InvQty = item.PoQty;
                            item.InvBalQty = 0;
                            invListPayload.push({
                                REF_INV: this.obj.InvoiceNumber,
                                Item_Code: item.ItemCode,
                                Po_Num: item.PNum_PoNum,
                                INVOICE_DATE: this.obj.InvoiceDate,
                                INVOICE_AMT: this.obj.TotalInvoiceAmount,
                                IGST_AMT: this.obj.Items.IGSTAmt,
                                CGST_AMT: this.obj.Items.CGSTAmt,
                                SGST_AMT: this.obj.Items.SGSTAmt,
                                Po_Qty: item.PoQty,
                                Inv_Qty: item.PoQty,
                                InvBal_Qty: 0,
                                INV_DELETE: false
                            });
                            return item;
                        }));
                        let settings = {
                            async: true,
                            url: jQuery.sap.getModulePath("com/extension/porequest") + "/po/odata/v4/catalog/stageDocumentRows",
                            method: "POST",
                            headers: {
                                "content-type": "application/json"
                            },
                            processData: false,
                            data: JSON.stringify({ data: payData })
                        };
                        $.ajax(settings)
                            .done(() => {
                                settings = {
                                    async: true,
                                    url: jQuery.sap.getModulePath("com/extension/porequest") + "/po/odata/v4/catalog/stageInvHeaderList",
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json"
                                    },
                                    processData: false,
                                    data: JSON.stringify({ data: JSON.stringify(invListPayload) })
                                };
                                $.ajax(settings).done(() => {
                                    BusyIndicator.hide();
                                    MessageBox.success("Action taken successfully", {
                                        onClose: () => {
                                            let content;
                                            switch (this.payload.Action) {
                                                case "A":
                                                    content = " approved by purchase team.";
                                                    break;
                                                case "R":
                                                    content = " rejected by purchase team.";
                                                    break;
                                            }
                                            this.sendEmailNotification("Invoice " + this.invNo + content);
                                            this.dialogSource.getParent().destroy();
                                            this.getData();
                                        }
                                    });
                                });
                            });
                    },
                    error: (responseText) => {
                        BusyIndicator.hide();
                        MessageBox.error(JSON.parse(responseText).error.message.value);
                    }
                });
            },

            takeAction: function () {
                BusyIndicator.show();
                setTimeout(() => {
                    this.getView().getModel().update("/PoList(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')", this.payload, {
                        success: () => {
                            this.createPoEntry();
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 500);
            },

            validateReqFields: function (fields) {
                let check = [], control, val;
                fields.forEach(inp => {
                    control = sap.ui.getCore().byId(inp);
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

            onAttachmentPress: function (evt) {
                BusyIndicator.show();
                const source = evt.getSource(),
                    id = source.getBindingContext().getProperty("Id");
                setTimeout(() => {
                    this.getView().getModel().read("/Attachments", {
                        filters: [new Filter("Id", "EQ", id)],
                        success: (data) => {
                            data.results.map(item => item.Url = this.getView().getModel().sServiceUrl + "/Attachments(Id='"
                                + item.Id + "',ObjectId='" + item.ObjectId + "')/$value");
                            var popOver = sap.ui.xmlfragment("com.extension.porequest.fragment.Attachment", this);
                            sap.ui.getCore().byId("attachPopover").setModel(new JSONModel(data), "AttachModel");
                            this.getView().addDependent(popOver);
                            popOver.openBy(source);
                            BusyIndicator.hide();
                        },
                        error: () => BusyIndicator.hide()
                    });
                }, 1000);
            },

            onPopOverClosePress: function (evt) {
                evt.getSource().getParent().getParent().destroy();
            },

            onInvoiceTypeChange: function (evt) {
                const email = evt.getParameter("selectedItem").getBindingContext().getProperty("ApproverEmail");
                this.getView().getModel("DataModel").getData().Approver = email;
                this.getView().getModel("DataModel").refresh(true);
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
            }
        });
    });
