jQuery.sap.declare("formatter");
formatter = {
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
    formatDate: function (oDate) {
        if (oDate && oDate !== "00000000") {
            return sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "MMM dd, yyyy"
            }).format(new Date(oDate.substring(4, 6) + "/" + oDate.substring(6, 8) + "/" + oDate.substring(0, 4)));
        } else {
            return "";
        }
    },
    formatStatus: function (status) {
        var text = "";
        if (status) {
            switch (status) {
                case "PWP":
                    text = "Pending with Purchase";
                    break;
                case "ABP":
                    text = "Approved by Purchase";
                    break;
                case "RBP":
                    text = "Rejected by Purchase";
                    break;
            }
        }
        return text;
    },
    statusState: function (status) {
        var state = "None";
        if (status) {
            switch (status) {
                case "ABP":
                    state = "Success";
                    break;
                case "PWP":
                    state = "Warning";
                    break;
                default:
                    state = "Error";
                    break;
            }
        }
        return state;
    },
    checkApprovalAccess: function (status, approver) {
        if (status === "PWP" && approver === sap.ui.getCore().loginEmail) {
            return true;
        } else {
            return false;
        }
    },
    invNoLink: function (status, createdBy) {
        if (status && createdBy) {
            if (status === "RBP" && sap.ui.getCore().loginEmail === createdBy) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    addBtnVisible: function () {
        if (this.getModel().getHeaders().loginType === "P") {
            return true;
        } else {
            return false;
        }
    }
};