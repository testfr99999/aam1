@isTest
private class ParkLocatorTest {
    @isTest static void testCallout() {              
        Test.setMock(WebServiceMock.class, new ParkServiceMock());
        // Call the method that invokes a callout
		List<String> resultList = ParkLocator.country('Germany');
        // Verify that a fake result is returned
        System.assertEquals('Hamburg Wadden Sea National Park', resultList[0]); 
        System.assertEquals('Hainich National Park', resultList[1]); 
        System.assertEquals('Bavarian Forest National Park', resultList[2]); 
    }
}