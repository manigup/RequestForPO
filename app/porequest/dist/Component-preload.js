//@ui5-bundle com/extension/porequest/Component-preload.js
jQuery.sap.registerPreloadedModules({
"version":"2.0",
"modules":{
	"com/extension/porequest/Component.js":function(){sap.ui.define(["sap/ui/core/UIComponent","sap/m/MessageBox","com/extension/porequest/model/formatter"],function(e,t){"use strict";return e.extend("com.extension.porequest.Component",{metadata:{manifest:"json"},init:function(){e.prototype.init.apply(this,arguments);this.getModel().metadataLoaded(true).then(()=>{var e=window.location.href.includes("site");if(e){var t=e?"/":"";var s=jQuery.sap.getModulePath("com/extension/porequest");s=s==="."?"":s;$.ajax({url:s+t+"user-api/attributes",type:"GET",success:e=>{const t=e;sap.ui.getCore().loginEmail=t.email;this.setHeaders(t.login_name[0],t.type[0].substring(0,1).toUpperCase())}})}else{sap.ui.getCore().loginEmail="rajeshsehgal@impauto.com";this.setHeaders("1100123","P")}}).catch(e=>this.handleError(e.responseText));this.getModel().attachRequestFailed(e=>this.handleError(e.getParameter("response").responseText))},setHeaders:function(e,t){this.getModel().setHeaders({loginId:e,loginType:t});this.getRouter().initialize()},handleError:function(e){if(e.indexOf("<?xml")!==-1){t.error($($.parseXML(e)).find("message").text())}else if(e.indexOf("{")!==-1){t.error(JSON.parse(e).error.message.value)}else{t.error(e)}}})});
},
	"com/extension/porequest/controller/Upload.controller.js":function(){sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel","sap/ui/core/BusyIndicator","sap/ui/model/Filter","sap/m/MessageBox"],function(e,t,i,o,s){"use strict";return e.extend("com.extension.porequest.controller.Upload",{onInit:function(){this.tblTemp=this.byId("uploadTblTemp").clone();this.getView().setModel(new t,"DataModel");this.getView().setModel(new t({}),"EditModel");this.getView().setModel(new t([]),"AttachmentModel");this.getView().setModel(new t({}),"Filter")},onAfterRendering:function(){this.getData()},getData:function(){const e=this.getView().getModel("Filter").getData();let t=[];Object.keys(e).forEach(i=>{if(!jQuery.isEmptyObject(e[i])){t.push(new o(i,"EQ",e[i]))}});this.byId("uploadTbl").bindAggregation("items",{path:"/PoList",filters:t,template:this.tblTemp})},onFilterClear:function(){this.getView().getModel("Filter").setData({});this.getView().getModel("Filter").refresh(true)},onAddPress:function(){const e=sap.ui.xmlfragment("com.extension.porequest.fragment.Create",this);this.getView().addDependent(e);this.getView().getModel("DataModel").setData({});this.getView().getModel("DataModel").refresh(true);sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl+"/Attachments");e.open()},onInvNoPress:function(e){const t=e.getSource().getBindingContext().getObject();const i=sap.ui.xmlfragment("com.extension.porequest.fragment.Edit",this);this.getView().addDependent(i);this.getView().getModel("EditModel").setData(t);this.getView().getModel("EditModel").refresh(true);this.invNo=t.InvoiceNumber;this.id=t.Id;this.poNo=t.PONumber;this.getAttachments();sap.ui.getCore().byId("attachment").setUploadUrl(this.getView().getModel().sServiceUrl+"/Attachments");i.open()},getAttachments:function(){this.getView().getModel().read("/Attachments",{filters:[new o("Id","EQ",this.id)],success:e=>{this.getView().getModel("AttachmentModel").setData(e.results);this.getView().getModel("AttachmentModel").refresh(true);i.hide()},error:()=>i.hide()})},onCreatePress:function(e){this.dialogSource=e.getSource();if(this.validateReqFields(["invDate","invNo","invAmmount","gst","invType","po"])&&sap.ui.getCore().byId("attachment").getIncompleteItems().length>0){i.show();const e=this.getView().getModel("DataModel").getData();setTimeout(()=>{this.getView().getModel().create("/PoList",e,{success:e=>{this.toAddress=e.HodApprover;this.invNo=e.InvoiceNumber;this.id=e.Id;this.poNo=e.PONumber;this.doAttachment()},error:()=>i.hide()})},500)}else{s.error("Please fill all required inputs to proceed")}},onEditPress:function(e){this.dialogSource=e.getSource();if(this.validateReqFields(["invDate","invNo","invAmmount","gst","invType"])){i.show();const e=this.getView().getModel("EditModel").getData();e.Action="E";setTimeout(()=>{this.getView().getModel().update("/PoList(InvoiceNumber='"+this.invNo+"',Id='"+this.id+"',PONumber='"+this.poNo+"')",e,{success:t=>{i.hide();s.success("Invoice "+t.InvoiceNumber+" updated successfully",{onClose:()=>{this.toAddress=e.HodApprover;const t="Invoice "+this.invNo+" with PO"+this.poNo+" updated by supplier "+sap.ui.getCore().loginEmail.split("@")[0]+".";this.sendEmailNotification(t);this.dialogSource.getParent().destroy();this.getData()}})},error:()=>i.hide()})},500)}else{s.error("Please fill all required inputs to proceed")}},onActionChange:function(e){const t=e.getSource(),i=t.getBindingContext().getObject(),o=t.getSelectedKey();s.confirm("Are you sure ?",{onClose:e=>{if(e==="YES"){this.invNo=i.InvoiceNumber;this.id=i.Id;this.poNo=i.PONumber;this.toAddress=i.createdBy;this.payload={Action:o};const e=sap.ui.xmlfragment("com.extension.porequest.fragment.Remarks",this);this.getView().addDependent(e);const t=o==="A"?"Approval":"Rejection";e.setTitle(t);e.open()}},actions:["YES","NO"]})},onRemarksSubmit:function(e){this.dialogSource=e.getSource();if(this.validateReqFields(["remarks"])){this.payload.ApproverRemarks=sap.ui.getCore().byId("remarks").getValue();this.takeAction()}else{s.error("Please fill all required inputs to proceed")}},takeAction:function(){setTimeout(()=>{this.getView().getModel().update("/PoList(Id='"+this.id+"',InvoiceNumber='"+this.invNo+"',PONumber='"+this.poNo+"')",this.payload,{success:()=>{i.hide();s.success("Action taken successfully",{onClose:()=>{let e;switch(this.payload.Action){case"A":e=" approved by purchase team.";break;case"R":e=" rejected by purchase team.";break}this.sendEmailNotification("Invoice "+this.invNo+" with PO "+this.poNo+e);this.dialogSource.getParent().destroy();this.getData()}})},error:()=>i.hide()})},500)},validateReqFields:function(e){let t=[],i,o;e.forEach(e=>{i=sap.ui.getCore().byId(e);o=i.getMetadata().getName()==="sap.m.Select"?i.getSelectedKey():i.getValue();if(o===""){i.setValueState("Error").setValueStateText("Required");t.push(false)}else{i.setValueState("None");t.push(true)}});if(t.every(e=>e===true))return true;else return false},doAttachment:function(){this.items=sap.ui.getCore().byId("attachment").getIncompleteItems();sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)},onAttachItemAdd:function(e){e.getParameter("item").setVisibleEdit(false).setVisibleRemove(false)},onBeforeUploadStarts:function(e){e.getParameter("item").addHeaderField(new sap.ui.core.Item({key:"slug",text:this.id+"/"+e.getParameter("item").getFileName()}))},onUploadComplete:function(){if(sap.ui.getCore().byId("attachment").getIncompleteItems().length===0){i.hide();s.success("Invoice "+this.invNo+" uploaded successfully",{onClose:()=>{const e="Invoice "+this.invNo+" with PO "+this.poNo+" uploaded by supplier "+sap.ui.getCore().loginEmail.split("@")[0]+".";this.sendEmailNotification(e);this.getView().getModel("DataModel").setData({});this.dialogSource.getParent().destroy();this.getData()}})}else{sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)}},onAttachmentUploadComplete:function(){if(sap.ui.getCore().byId("attachment").getIncompleteItems().length>0){sap.ui.getCore().byId("attachment").uploadItem(this.items[0]);this.items.splice(0,1)}},onAttachmentPress:function(e){i.show();const s=e.getSource(),n=s.getBindingContext().getProperty("Id");setTimeout(()=>{this.getView().getModel().read("/Attachments",{filters:[new o("Id","EQ",n)],success:e=>{e.results.map(e=>e.Url=this.getView().getModel().sServiceUrl+"/Attachments(Id='"+e.Id+"',ObjectId='"+e.ObjectId+"')/$value");var o=sap.ui.xmlfragment("com.extension.porequest.fragment.Attachment",this);sap.ui.getCore().byId("attachPopover").setModel(new t(e),"AttachModel");this.getView().addDependent(o);o.openBy(s);i.hide()},error:()=>i.hide()})},1e3)},onDialogClose:function(e){e.getSource().destroy()},onDialogCancel:function(e){e.getSource().getParent().destroy()},onPopOverClosePress:function(e){e.getSource().getParent().getParent().destroy()},onInvoiceTypeChange:function(e){const t=e.getParameter("selectedItem").getBindingContext().getProperty("ApproverEmail");this.getView().getModel("DataModel").getData().Approver=t;this.getView().getModel("DataModel").refresh(true)},sendEmailNotification:function(e){const t=window.location.origin+"/site/SP#invupload-manage?sap-ui-app-id-hint=saas_approuter_com.extension.porequest";return new Promise((i,o)=>{const s=`|| ${e} Kindly log-in with the link to take your action.<br><br><a href='${t}'>CLICK HERE</a>`,n=this.getView().getModel(),a={method:"GET",urlParameters:{content:s,toAddress:this.toAddress},success:function(e){console.log("Email sent successfully.");i(e)},error:function(e){console.log("Failed to send email.");o(e)}};n.callFunction("/sendEmail",a)})}})});
},
	"com/extension/porequest/fragment/Attachment.fragment.xml":'<core:FragmentDefinition\r\n    xmlns="sap.m"\r\n    xmlns:core="sap.ui.core"\r\n><Popover\r\n        showHeader="false"\r\n        placement="Left"\r\n        modal="true"\r\n        titleAlignment="Center"\r\n        contentMinWidth="350px"\r\n        afterClose="onPopOverAfterClose"\r\n        id="attachPopover"\r\n    ><UploadCollection\r\n            id="attachment"\r\n            items="{AttachModel>/results}"\r\n            uploadButtonInvisible="true"\r\n        ><items><UploadCollectionItem\r\n                    id="_IDGenUploadCollectionItem1"\r\n                    fileName="{AttachModel>Filename}"\r\n                    url="{AttachModel>Url}"\r\n                    visibleEdit="false"\r\n                    visibleDelete="false"\r\n                /></items></UploadCollection><footer><OverflowToolbar id="_IDGenOverflowToolbar1"><ToolbarSpacer id="_IDGenToolbarSpacer1" /><Button\r\n                    id="_IDGenButton1"\r\n                    text="Close"\r\n                    press="onPopOverClosePress"\r\n                /></OverflowToolbar></footer></Popover></core:FragmentDefinition>\r\n',
	"com/extension/porequest/fragment/Create.fragment.xml":'<Dialog\n    id="_IDGenDialog1"\n    xmlns:f="sap.ui.layout.form"\n    xmlns:u="sap.m.upload"\n    xmlns:core="sap.ui.core"\n    xmlns="sap.m"\n    draggable="true"\n    contentWidth="350px"\n    contentHeight="400px"\n    afterClose="onDialogClose"\n    title="Upload New Invoice"\n    titleAlignment="Center"\n><content><f:SimpleForm\n            id="_IDGenSimpleForm1"\n            editable="true"\n            layout="ResponsiveGridLayout"\n        ><Label\n                id="_IDGenLabel1"\n                required="true"\n                design="Bold"\n                text="Invoice Date"\n            /><DatePicker\n                id="invDate"\n                valueFormat="yyyyMMdd"\n                value="{DataModel>/InvoiceDate}"\n            /><Label\n                id="_IDGenLabel2"\n                required="true"\n                design="Bold"\n                text="Invoice Number"\n            /><Input\n                id="invNo"\n                value="{DataModel>/InvoiceNumber}"\n            /><Label\n                id="_IDGenLabel3"\n                required="true"\n                design="Bold"\n                text="Total Invoice Amount"\n            /><Input\n                id="invAmmount"\n                type="Number"\n                value="{DataModel>/TotalInvoiceAmount}"\n            /><Label\n                id="_IDGenLabel4"\n                required="true"\n                design="Bold"\n                text="GST"\n            /><Input\n                id="gst"\n                type="Number"\n                value="{DataModel>/GST}"\n            /><Label\n                id="_IDGenLabel5"\n                required="true"\n                design="Bold"\n                text="Invoice Type"\n            /><Select\n                id="invType"\n                selectedKey="{DataModel>/InvoiceType}"\n                forceSelection="false"\n                items="{/InvoiceType}"\n                change="onInvoiceTypeChange"\n            ><core:Item\n                    id="_IDGenItem1"\n                    key="{Type}"\n                    text="{Type}"\n                /></Select><Label\n                required="true"\n                design="Bold"\n                text="PO Number"\n            /><Input\n                id="po"\n                value="{DataModel>/PONumber}"\n            /><Label\n                design="Bold"\n                text="Eway Bill No."\n            /><Input value="{DataModel>/EwayBillNumber}" /><Label\n                design="Bold"\n                text="Eway Bill Date"\n            /><DatePicker\n                value="{DataModel>/EwayBillDate}"\n                valueFormat="yyyyMMdd"\n            /><Label\n                id="_IDGenLabel8"\n                design="Bold"\n                text="Approver"\n            /><Input\n                value="{DataModel>/Approver}"\n                enabled="false"\n            /><Label\n                id="_IDGenLabel7"\n                required="true"\n                design="Bold"\n                text="Attachment"\n            /><u:UploadSet\n                id="attachment"\n                mode="None"\n                showIcons="false"\n                fileTypes="pdf,xlsx,doc,png,jpeg"\n                multiple="true"\n                instantUpload="false"\n                maxFileSize="10"\n                uploadCompleted="onUploadComplete"\n                beforeUploadStarts="onBeforeUploadStarts"\n                uploadButtonInvisible="false"\n                afterItemAdded="onAttachItemAdd"\n            /></f:SimpleForm></content><beginButton><Button\n            id="_IDGenButton1"\n            type="Emphasized"\n            text="Submit"\n            press="onCreatePress"\n        /></beginButton><endButton><Button\n            id="_IDGenButton2"\n            type="Reject"\n            text="Cancel"\n            press="onDialogCancel"\n        /></endButton></Dialog>\n',
	"com/extension/porequest/fragment/Edit.fragment.xml":'<Dialog\n    id="_IDGenDialog1"\n    xmlns:f="sap.ui.layout.form"\n    xmlns:upload="sap.m.upload"\n    xmlns:core="sap.ui.core"\n    xmlns="sap.m"\n    draggable="true"\n    contentWidth="350px"\n    contentHeight="400px"\n    afterClose="onDialogClose"\n    title="Edit Invoice - {EditModel>/InvoiceNumber}"\n    titleAlignment="Center"\n><content><f:SimpleForm\n            id="_IDGenSimpleForm1"\n            editable="true"\n            layout="ResponsiveGridLayout"\n        ><Label\n                id="_IDGenLabel1"\n                required="true"\n                design="Bold"\n                text="Invoice Date"\n            /><DatePicker\n                id="invDate"\n                valueFormat="yyyyMMdd"\n                value="{EditModel>/InvoiceDate}"\n            /><Label\n                id="_IDGenLabel2"\n                required="true"\n                design="Bold"\n                text="Invoice Number"\n            /><Input\n                id="invNo"\n                value="{EditModel>/InvoiceNumber}"\n                enabled="false"\n            /><Label\n                id="_IDGenLabel3"\n                required="true"\n                design="Bold"\n                text="Total Invoice Amount"\n            /><Input\n                id="invAmmount"\n                type="Number"\n                value="{EditModel>/TotalInvoiceAmount}"\n            /><Label\n                id="_IDGenLabel4"\n                required="true"\n                design="Bold"\n                text="GST"\n            /><Input\n                id="gst"\n                type="Number"\n                value="{EditModel>/GST}"\n            /><Label\n                id="_IDGenLabel5"\n                required="true"\n                design="Bold"\n                text="Invoice Type"\n            /><Select\n                id="invType"\n                selectedKey="{EditModel>/InvoiceType}"\n                forceSelection="false"\n                items="{/InvoiceType}"\n                change="onInvoiceTypeChange"\n            ><core:Item\n                    id="_IDGenItem1"\n                    key="{Type}"\n                    text="{Type}"\n                /></Select><Label\n                required="true"\n                design="Bold"\n                text="PO Number"\n            /><Input\n                value="{EditModel>/PONumber}"\n                enabled="false"\n            /><Label\n                design="Bold"\n                text="Eway Bill No."\n            /><Input value="{EditModel>/EwayBillNumber}" /><Label\n                design="Bold"\n                text="Eway Bill Date"\n            /><DatePicker\n                value="{EditModel>/EwayBillDate}"\n                valueFormat="yyyyMMdd"\n            /><Label\n                id="_IDGenLabel8"\n                design="Bold"\n                text="Approver"\n            /><Input\n                id="hod"\n                value="{EditModel>/Approver}"\n                enabled="false"\n            /><Label\n                id="_IDGenLabel7"\n                required="true"\n                design="Bold"\n                text="Attachment"\n            /><upload:UploadSet\n                id="attachment"\n                mode="None"\n                showIcons="false"\n                fileTypes="pdf,xlsx,doc,png,jpeg"\n                multiple="true"\n                maxFileSize="10"\n                uploadCompleted="onAttachmentUploadComplete"\n                beforeUploadStarts="onBeforeUploadStarts"\n                uploadButtonInvisible="false"\n                afterItemAdded="onAttachItemAdd"\n                items="{AttachmentModel>/}"\n            ><upload:items><upload:UploadSetItem\n                        id="_IDGenUploadSetItem1"\n                        fileName="{AttachmentModel>Filename}"\n                        mediaType="{AttachmentModel>Mediatype}"\n                        visibleEdit="false"\n                        visibleRemove="false"\n                    /></upload:items></upload:UploadSet></f:SimpleForm></content><beginButton><Button\n            id="_IDGenButton1"\n            type="Emphasized"\n            text="Submit"\n            press="onEditPress"\n        /></beginButton><endButton><Button\n            id="_IDGenButton2"\n            type="Reject"\n            text="Cancel"\n            press="onDialogCancel"\n        /></endButton></Dialog>\n',
	"com/extension/porequest/fragment/Remarks.fragment.xml":'<Dialog\n    id="_IDGenDialog1"\n    xmlns:f="sap.ui.layout.form"\n    xmlns="sap.m"\n    draggable="true"\n    contentWidth="300px"\n    afterClose="onDialogClose"\n    titleAlignment="Center"\n><content><f:SimpleForm\n            id="_IDGenSimpleForm1"\n            editable="true"\n            layout="ResponsiveGridLayout"\n        ><Label\n                id="_IDGenLabel2"\n                required="true"\n                design="Bold"\n                text="Enter Remarks"\n            /><TextArea\n                growing="true"\n                id="remarks"\n            /></f:SimpleForm></content><beginButton><Button\n            id="_IDGenButton1"\n            type="Emphasized"\n            text="Submit"\n            press="onRemarksSubmit"\n        /></beginButton><endButton><Button\n            id="_IDGenButton2"\n            type="Reject"\n            text="Cancel"\n            press="onDialogCancel"\n        /></endButton></Dialog>\n',
	"com/extension/porequest/i18n/i18n.properties":'# This is the resource bundle for com.extension.porequest\n\n#Texts for manifest.json\n\n#XTIT: Application name\nappTitle=Request For PO\n\n#YDES: Application description\nappDescription=An SAP Fiori application.\n#XTIT: Main view title\ntitle=Request For PO\n\nflpTitle=Request For PO\n',
	"com/extension/porequest/manifest.json":'{"_version":"1.59.0","sap.app":{"id":"com.extension.porequest","type":"application","i18n":"i18n/i18n.properties","applicationVersion":{"version":"0.0.1"},"title":"{{appTitle}}","description":"{{appDescription}}","resources":"resources.json","sourceTemplate":{"id":"@sap/generator-fiori:basic","version":"1.12.5","toolsId":"7a290b63-825d-4a0b-8d10-3a42974ac306"},"dataSources":{"mainService":{"uri":"poreq/odata/v4/catalog/","type":"OData","settings":{"annotations":[],"odataVersion":"2.0"}}},"crossNavigation":{"inbounds":{"porequest-manage":{"semanticObject":"porequest","action":"manage","title":"{{flpTitle}}","icon":"sap-icon://my-sales-order","signature":{"parameters":{},"additionalParameters":"allowed"}}}}},"sap.ui":{"technology":"UI5","icons":{"icon":"","favIcon":"","phone":"","phone@2":"","tablet":"","tablet@2":""},"deviceTypes":{"desktop":true,"tablet":true,"phone":true}},"sap.ui5":{"flexEnabled":true,"dependencies":{"minUI5Version":"1.121.1","libs":{"sap.m":{},"sap.ui.core":{},"sap.f":{},"sap.suite.ui.generic.template":{},"sap.ui.comp":{},"sap.ui.generic.app":{},"sap.ui.table":{},"sap.ushell":{}}},"contentDensities":{"compact":true,"cozy":true},"models":{"i18n":{"type":"sap.ui.model.resource.ResourceModel","settings":{"bundleName":"com.extension.porequest.i18n.i18n"}},"":{"dataSource":"mainService","preload":true,"settings":{"synchronizationMode":"None","operationMode":"Server","autoExpandSelect":true,"earlyRequests":true,"useBatch":false,"refreshAfterChange":false,"defaultCountMode":"None"}}},"resources":{"css":[{"uri":"css/style.css"}]},"routing":{"config":{"routerClass":"sap.m.routing.Router","viewType":"XML","async":true,"viewPath":"com.extension.porequest.view","controlAggregation":"pages","controlId":"app","clearControlAggregation":false},"routes":[{"name":"Upload","pattern":":?query:","target":["TargetView1"]}],"targets":{"TargetView1":{"viewType":"XML","transition":"slide","clearControlAggregation":false,"viewId":"Upload","viewName":"Upload"}}},"rootView":{"viewName":"com.extension.porequest.view.App","type":"XML","async":true,"id":"App"}},"sap.cloud":{"public":true,"service":"porequest"}}',
	"com/extension/porequest/model/formatter.js":function(){jQuery.sap.declare("formatter");formatter={formatDate:function(e){if(e&&e!=="00000000"){return sap.ui.core.format.DateFormat.getDateInstance({pattern:"MMM dd, yyyy"}).format(new Date(e.substring(4,6)+"/"+e.substring(6,8)+"/"+e.substring(0,4)))}else{return""}},formatStatus:function(e){var r="";if(e){switch(e){case"PWP":r="Pending with Purchase";break;case"ABP":r="Approved by Purchase";break;case"RBP":r="Rejected by Purchase";break}}return r},statusState:function(e){var r="None";if(e){switch(e){case"ABP":r="Success";break;case"PWP":r="Warning";break;default:r="Error";break}}return r},checkApprovalAccess:function(e,r){const t=this.getModel().getHeaders().loginId;if(e==="PWP"&&r===t){return true}else{return false}},invNoLink:function(e,r){if(e&&r){if(e==="RBP"&&sap.ui.getCore().loginEmail===r){return true}else{return false}}else{return false}},addBtnVisible:function(){if(this.getModel().getHeaders().loginType==="P"){return true}else{return false}}};
},
	"com/extension/porequest/model/models.js":function(){sap.ui.define(["sap/ui/model/json/JSONModel","sap/ui/Device"],function(e,n){"use strict";return{createDeviceModel:function(){var i=new e(n);i.setDefaultBindingMode("OneWay");return i}}});
},
	"com/extension/porequest/view/App.view.xml":'<mvc:View\n    xmlns:mvc="sap.ui.core.mvc"\n    xmlns="sap.m"\n><Shell id="_IDGenShell1"><App id="app" /></Shell></mvc:View>\n',
	"com/extension/porequest/view/Upload.view.xml":'<mvc:View\n    controllerName="com.extension.porequest.controller.Upload"\n    xmlns:fb="sap.ui.comp.filterbar"\n    xmlns:mvc="sap.ui.core.mvc"\n    xmlns:core="sap.ui.core"\n    xmlns="sap.m"\n><Page\n        id="page"\n        title="List"\n        titleAlignment="Center"\n    ><headerContent><Button\n                id="_IDGenButton1"\n                type="Emphasized"\n                text="Add"\n                icon="sap-icon://add"\n                press="onAddPress"\n                visible="{path:\'\',formatter:\'formatter.addBtnVisible\'}"\n            /></headerContent><content><fb:FilterBar\n                id="_IDGenFilterBar1"\n                useToolbar="false"\n                showFilterConfiguration="false"\n                search="getData"\n                showClearOnFB="true"\n                clear="onFilterClear"\n            ><fb:filterItems><fb:FilterItem\n                        id="_IDGenFilterItem1"\n                        name="A"\n                        label="Invoice Number"\n                    ><fb:control><Input\n                                id="_IDGenInput1"\n                                value="{Filter>/InvoiceNumber}"\n                            /></fb:control></fb:FilterItem><fb:FilterItem\n                        id="_IDGenFilterItem2"\n                        name="B"\n                        label="Invoice Date"\n                    ><fb:control><DatePicker\n                                id="_IDGenDatePicker1"\n                                valueFormat="yyyyMMdd"\n                                value="{Filter>/InvoiceDate}"\n                            /></fb:control></fb:FilterItem><fb:FilterItem\n                        id="_IDGenFilterItem3"\n                        name="C"\n                        label="Invoice Type"\n                    ><fb:control><Select\n                                id="_IDGenSelect3"\n                                selectedKey="{Filter>/InvoiceType}"\n                                forceSelection="false"\n                                items="{/InvoiceType}"\n                            ><core:Item\n                                    id="_IDGenItem6"\n                                    key="{Type}"\n                                    text="{Type}"\n                                /></Select></fb:control></fb:FilterItem><fb:FilterItem\n                        id="_IDGenFilterItem4"\n                        name="D"\n                        label="Status"\n                    ><fb:control><Select\n                                id="_IDGenSelect2"\n                                forceSelection="false"\n                                selectedKey="{Filter>/Status}"\n                            ><core:Item\n                                    id="_IDGenItem4"\n                                    key="PWP"\n                                    text="Pending with Purchase"\n                                /><core:Item\n                                    id="_IDGenItem5"\n                                    key="ABP"\n                                    text="Approved by Purchase"\n                                /><core:Item\n                                    id="_IDGenItem3"\n                                    key="RBP"\n                                    text="Rejected by Purchase"\n                                /></Select></fb:control></fb:FilterItem></fb:filterItems></fb:FilterBar><ScrollContainer\n                id="_IDGenScrollContainer1"\n                horizontal="true"\n                vertical="true"\n                height="80%"\n            ><Table\n                    id="uploadTbl"\n                    sticky="ColumnHeaders"\n                    growing="true"\n                    growingThreshold="40"\n                    alternateRowColors="true"\n                ><columns><Column\n                            id="_IDGenColumn3"\n                            hAlign="Center"\n                            width="6rem"\n                        ><Label\n                                id="_IDGenLabel3"\n                                design="Bold"\n                                text="Invoice Number"\n                                wrapping="true"\n                            /></Column><Column\n                            hAlign="Center"\n                            width="6rem"\n                        ><Label\n                                design="Bold"\n                                text="PO Number"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn2"\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel2"\n                                design="Bold"\n                                text="Invoice Date"\n                            /></Column><Column\n                            id="_IDGenColumn15"\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel18"\n                                design="Bold"\n                                text="Uploaded By"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn4"\n                            hAlign="Center"\n                            width="6rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel4"\n                                design="Bold"\n                                text="Total Invoice Amount"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn5"\n                            hAlign="Center"\n                            width="6rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel5"\n                                design="Bold"\n                                text="GST"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn6"\n                            hAlign="Center"\n                            width="8rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel6"\n                                design="Bold"\n                                text="Invoice Type"\n                                wrapping="true"\n                            /></Column><Column\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                design="Bold"\n                                text="Eway Bill No."\n                                wrapping="true"\n                            /></Column><Column\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                design="Bold"\n                                text="Eway Bill Date"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn8"\n                            hAlign="Center"\n                            width="10rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel11"\n                                design="Bold"\n                                text="Status"\n                            /></Column><Column\n                            id="_IDGenColumn9"\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel12"\n                                design="Bold"\n                                text="Action"\n                            /></Column><Column\n                            id="_IDGenColumn12"\n                            hAlign="Center"\n                            width="7rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel15"\n                                design="Bold"\n                                text="Approver Remarks"\n                                wrapping="true"\n                            /></Column><Column\n                            id="_IDGenColumn10"\n                            hAlign="Center"\n                            width="6rem"\n                            minScreenWidth="700px"\n                            demandPopin="true"\n                            popinDisplay="Inline"\n                        ><Label\n                                id="_IDGenLabel13"\n                                design="Bold"\n                                text="Attachments"\n                            /></Column></columns><items><ColumnListItem id="uploadTblTemp"><cells><ObjectIdentifier\n                                    id="_IDGenObjectIdentifier1"\n                                    title="{InvoiceNumber}"\n                                    titleActive="{parts: [{path: \'Status\'},{path: \'createdBy\'}],formatter:\'formatter.invNoLink\'}"\n                                    titlePress="onInvNoPress"\n                                /><Text text="{PONumber}" /><Text\n                                    id="_IDGenText2"\n                                    text="{path:\'InvoiceDate\',formatter:\'formatter.formatDate\'}"\n                                /><Text\n                                    id="_IDGenText16"\n                                    text="{createdBy}"\n                                /><Text\n                                    id="_IDGenText4"\n                                    text="{TotalInvoiceAmount}"\n                                /><Text\n                                    id="_IDGenText5"\n                                    text="{GST}"\n                                /><Text\n                                    id="_IDGenText6"\n                                    text="{InvoiceType}"\n                                /><Text text="{EwayBillNumber}" /><Text\n                                    text="{path:\'EwayBillDate\',formatter:\'formatter.formatDate\'}"\n                                /><ObjectStatus\n                                    id="_IDGenObjectStatus1"\n                                    text="{path:\'Status\',formatter:\'formatter.formatStatus\'}"\n                                    state="{path:\'Status\',formatter:\'formatter.statusState\'}"\n                                /><Select\n                                    id="_IDGenSelect1"\n                                    forceSelection="false"\n                                    enabled="{parts: [{path: \'Status\'},{path: \'Approver\'}],formatter:\'formatter.checkApprovalAccess\'}"\n                                    change="onActionChange"\n                                ><core:Item\n                                        id="_IDGenItem1"\n                                        key="A"\n                                        text="Accept"\n                                    /><core:Item\n                                        id="_IDGenItem2"\n                                        key="R"\n                                        text="Reject"\n                                    /></Select><Text\n                                    id="_IDGenText9"\n                                    text="{ApproverRemarks}"\n                                /><Link\n                                    id="_IDGenLink1"\n                                    emphasized="true"\n                                    text="View"\n                                    press="onAttachmentPress"\n                                /></cells></ColumnListItem></items></Table></ScrollContainer></content></Page></mvc:View>\n'
}});
