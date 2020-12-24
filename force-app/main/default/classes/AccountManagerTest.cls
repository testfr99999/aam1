@IsTest
private class AccountManagerTest {

    @isTest static void testGetAccount() {
        Id recordId = createTestRecord();
        System.debug('>>> recordId = ' + recordId);
        // Set up a test request
        RestRequest request = new RestRequest();
        request.requestUri =
            'https://eu6.salesforce.com/services/apexrest/Account/'
            + recordId + '/contacts';
        request.httpMethod = 'GET';
        RestContext.request = request;
        // Call the method to test
        Account thisAccount = AccountManager.getAccount();
        // Verify results
        System.assert(thisAccount != null);
        System.assertEquals('Test record', thisAccount.Name);
    }

    // Helper method
    static Id createTestRecord() {
        // Create test record
        Account accountTest = new Account(Name='Test record');
        insert accountTest;
		Contact contactTest1 = new Contact(LastName = 'Contact1', AccountId = accountTest.Id);
		Contact contactTest2 = new Contact(LastName = 'Contact2', AccountId = accountTest.Id);
        insert contactTest1;
        insert contactTest2;
        return accountTest.Id;
    }          
}