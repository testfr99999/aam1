@RestResource(urlMapping='/Account/*/contacts')
global with sharing class AccountManager {
    
    @HttpGet
    global static Account getAccount() {
        RestRequest request = RestContext.request;
        // grab the accountId from the URL
        String firstExtract = request.requestURI.substringBeforeLast('/');
        System.debug('>>> firstExtract = ' + firstExtract);
        String actId = firstExtract.substring(firstExtract.lastIndexOf('/')+1);
        System.debug('>>> actId = ' + actId);
        Account result = [SELECT id, Name, (SELECT contact.id, contact.Name FROM Account.Contacts) FROM Account WHERE Id = :actId];
        return result;
    }
}