"use strict";

import { MESSAGES } from "@config/constant";
import { extensionDaoV1 } from "..";
import { STATE_NAMES } from "@modules/eligibilityCheck/eligibilityConstants";



export class ExtensionController {


    /**
     * @function add
     * @params ip, nip, date, reason are required
     * @author Chitvan Baish
     * @description this function will add the extension
     */
    async add(params: ExtensionRequest.Add) {
        try {
            const result = await extensionDaoV1.addExtension(params);
            return MESSAGES.SUCCESS.ADD_EXTENSION(result)
        } catch (error) {
            throw error
        }
    }

    /**
     * @function delete
     * @params extension id is required
     * @author Chitvan Baish
     * @description this function will delete the extension
     */
    async delete(params: ExtensionRequest.ID) {
        try {
            const isExtensionExist = await extensionDaoV1.isExtensionExist(params)
            if (!isExtensionExist) return Promise.reject(MESSAGES.ERROR.EXTENSION_NOT_EXIST)
            const result = await extensionDaoV1.deleteExtension(params);
            return MESSAGES.SUCCESS.DELETE_EXTENSION
        } catch (error) {
            throw error
        }
    }

    /**
     * @function getList
     * @author Chitvan Baish
     * @description this function will give the list of the extensions
     */
    async getList(params:ListingRequest) {
        try {
            const result = await extensionDaoV1.getList(params)
            return MESSAGES.SUCCESS.LIST_EXTENSION(result)
        } catch (error) {
            throw error
        }
    }

     /**
     * @function ipList
     * @author Chitvan Baish
     * @description this function will give the list of the IPs
     */
     async ipList(params:ListingRequest, tokenData: TokenData) {
        try {
            const result = await extensionDaoV1.ipList(params)
            return MESSAGES.SUCCESS.DETAILS(result)
            
        } catch (error) {
            throw error
        }
    }

     /**
     * @function nipList
     * @author Chitvan Baish
     * @description this function will give the list of the NIPs
     */
     async nipList(params: ListingRequest) {
        try {
            const result = await extensionDaoV1.nipList(params)
            return MESSAGES.SUCCESS.DETAILS(result)
        } catch (error) {
            throw error
        }
    }

    /**
     * @function nipList
     * @author Chitvan Baish
     * @description this function will give the list of the NIPs
     */
    async stateList(tokenData: TokenData) {
        try {
            return MESSAGES.SUCCESS.DETAILS(STATE_NAMES)
        } catch (error) {
            throw error
        }
    }






}

export const extensionController = new ExtensionController();