jQuery.sap.declare("formatter");formatter={formatDate:function(e){if(e&&e!=="00000000"){return sap.ui.core.format.DateFormat.getDateInstance({pattern:"MMM dd, yyyy"}).format(new Date(e.substring(4,6)+"/"+e.substring(6,8)+"/"+e.substring(0,4)))}else{return""}},formatStatus:function(e){var r="";if(e){switch(e){case"PWP":r="Pending with Purchase";break;case"ABP":r="Approved by Purchase";break;case"RBP":r="Rejected by Purchase";break}}return r},statusState:function(e){var r="None";if(e){switch(e){case"ABP":r="Success";break;case"PWP":r="Warning";break;default:r="Error";break}}return r},checkApprovalAccess:function(e,r){const t=this.getModel().getHeaders().loginId;if(e==="PWP"&&r===t){return true}else{return false}},invNoLink:function(e,r){if(e&&r){if(e==="RBP"&&sap.ui.getCore().loginEmail===r){return true}else{return false}}else{return false}},addBtnVisible:function(){if(this.getModel().getHeaders().loginType==="P"){return true}else{return false}}};