@isTest
public class AnimalLocatorTest {
    
    @isTest static  void testGetAnimalNameById() {
        // Associate the callout with a mock response
        Test.setMock(HttpCalloutMock.class, new AnimalLocatorMock());   
        // Call method to test
        String result = AnimalLocator.getAnimalNameById(1);
        // // Verify mock response is not null
        // System.assertNotEquals(null,result,
        // 'The callout returned a null response.');
        // // Verify status code
        // System.assertEquals(200,result.getStatusCode(),
        // 'The status code is not 200.');
        // // Verify content type   
        // System.assertEquals('application/json;charset=UTF-8',
        // result.getHeader('Content-Type'),
        // 'The content type value is not expected.');  
        // // Verify the array contains 3 items     
        // Map<String, Object> results = (Map<String, Object>) 
        // JSON.deserializeUntyped(result.getBody());
        // List<Object> animals = (List<Object>) results.get('animals');
        // System.assertEquals(3, animals.size(),
        // 'The array should only contain 3 items.');          
    }   
    
}