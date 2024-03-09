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
                this.tblTemp = this.byId("uploadTblTemp").clone();
                this.getView().setModel(new JSONModel(), "DataModel");
                this.getView().setModel(new JSONModel({}), "EditModel");
                this.getView().setModel(new JSONModel([]), "AttachmentModel");
                this.getView().setModel(new JSONModel({}), "Filter");
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

            onAddPress: function () {
                const createFrag = sap.ui.xmlfragment("com.extension.porequest.fragment.Create", this);
                this.getView().addDependent(createFrag);
                this.getView().getModel("DataModel").setData({});
                this.getView().getModel("DataModel").refresh(true);
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                createFrag.open();
            },

            onInvNoPress: function (evt) {
                const obj = evt.getSource().getBindingContext().getObject();
                const frag = sap.ui.xmlfragment("com.extension.porequest.fragment.Edit", this);
                this.getView().addDependent(frag);
                this.getView().getModel("EditModel").setData(obj);
                this.getView().getModel("EditModel").refresh(true);
                this.invNo = obj.InvoiceNumber;
                this.id = obj.Id;
                this.getAttachments();
                sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl + "/Attachments");
                frag.open();
            },

            getAttachments: function () {
                this.getView().getModel().read("/Attachments", {
                    filters: [new Filter("Id", "EQ", this.id)],
                    success: data => {
                        this.getView().getModel("AttachmentModel").setData(data.results);
                        this.getView().getModel("AttachmentModel").refresh(true);
                        BusyIndicator.hide();
                    },
                    error: () => BusyIndicator.hide()
                });
            },

            onCreatePress: function (evt) {
                this.dialogSource = evt.getSource();
                if (this.validateReqFields(["invDate", "invNo", "invAmmount", "gst", "invType"]) && sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    BusyIndicator.show();
                    const payload = this.getView().getModel("DataModel").getData();
                    setTimeout(() => {
                        this.getView().getModel().create("/PoList", payload, {
                            success: sData => {
                                this.toAddress = sData.Approver;
                                this.invNo = sData.InvoiceNumber;
                                this.id = sData.Id;
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
                    const payload = this.getView().getModel("EditModel").getData();
                    payload.Action = "E";
                    setTimeout(() => {
                        this.getView().getModel().update("/PoList(InvoiceNumber='" + this.invNo + "',Id='" + this.id + "')", payload, {
                            success: sData => {
                                BusyIndicator.hide();
                                MessageBox.success("Invoice " + sData.InvoiceNumber + " updated successfully", {
                                    onClose: () => {
                                        this.toAddress = payload.Approver;
                                        const content = "Invoice " + this.invNo + " updated by supplier " + sap.ui.getCore().loginEmail.split("@")[0] + ".";
                                        this.sendEmailNotification(content);
                                        this.dialogSource.getParent().destroy();
                                        this.getData();
                                    }
                                });
                            },
                            error: () => BusyIndicator.hide()
                        });
                    }, 500);
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            onActionChange: function (evt) {
                const source = evt.getSource(),
                    obj = source.getBindingContext().getObject(),
                    selectedAction = source.getSelectedKey();
                MessageBox.confirm("Are you sure ?", {
                    onClose: (action) => {
                        if (action === "YES") {
                            this.invNo = obj.InvoiceNumber;
                            this.id = obj.Id;
                            this.toAddress = obj.createdBy;
                            this.payload = { Action: selectedAction };

                            const remarksFrag = sap.ui.xmlfragment("com.extension.porequest.fragment.Remarks", this);
                            this.getView().addDependent(remarksFrag);
                            const title = selectedAction === "A" ? "Approval" : "Rejection";
                            if (selectedAction === "A") {
                                sap.ui.getCore().byId("po").setVisible(true);
                            } else {
                                sap.ui.getCore().byId("po").setVisible(false);
                            }
                            remarksFrag.setTitle(title);
                            remarksFrag.open();
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
                        this.payload.PONumber = sap.ui.getCore().byId("po").getValue();
                    }
                    this.takeAction();
                } else {
                    MessageBox.error("Please fill all required inputs to proceed");
                }
            },

            takeAction: function () {
                setTimeout(() => {
                    this.getView().getModel().update("/PoList(Id='" + this.id + "',InvoiceNumber='" + this.invNo + "')", this.payload, {
                        success: () => {
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

            doAttachment: function () {
                this.items = sap.ui.getCore().byId("attachment").getIncompleteItems();
                sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
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
                if (sap.ui.getCore().byId("attachment").getIncompleteItems().length === 0) {
                    BusyIndicator.hide();
                    MessageBox.success("Invoice " + this.invNo + " uploaded successfully", {
                        onClose: () => {
                            const content = "Invoice " + this.invNo + " uploaded by supplier " + sap.ui.getCore().loginEmail.split("@")[0] + ".";
                            this.sendEmailNotification(content);
                            this.getView().getModel("DataModel").setData({});
                            this.dialogSource.getParent().destroy();
                            this.getData();
                        }
                    });
                } else {
                    sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
                    this.items.splice(0, 1);
                }
            },

            onAttachmentUploadComplete: function () {
                if (sap.ui.getCore().byId("attachment").getIncompleteItems().length > 0) {
                    sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);
                    this.items.splice(0, 1);
                }
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

            onDialogClose: function (evt) {
                evt.getSource().destroy();
            },

            onDialogCancel: function (evt) {
                evt.getSource().getParent().destroy();
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
            }
        });
    });
