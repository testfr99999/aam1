@IsTest
private class TestRestrictContactByName {

    @isTest static void testInvalidName() {
        // Test data setup
        Contact cnt = new Contact(LastName='INVALIDNAME');

        // Perform test
        Test.startTest();
        Database.SaveResult result = Database.insert(cnt, false);
        Test.stopTest();

        // Verify 
        // In this case the deletion should have been stopped by the trigger,
        // so verify that we got back an error.
        System.assert(!result.isSuccess());
        System.assert(result.getErrors().size() > 0);
        System.assertEquals('The Last Name "INVALIDNAME" is not allowed for DML',
                             result.getErrors()[0].getMessage());
    }

}