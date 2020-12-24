@IsTest
private class TestVerifyDate {

    @isTest static void testCheckDates() {
		Date result;
		
		result = VerifyDate.CheckDates(System.today()-30, System.today()-61);
		result = VerifyDate.CheckDates(System.today()-30, System.today()-20);
		result = VerifyDate.CheckDates(System.today()-30, System.today()+10);

        // Verify results
        // System.assert(thisAccount != null);
        // System.assertEquals('Test record', thisAccount.Name);
    }

}