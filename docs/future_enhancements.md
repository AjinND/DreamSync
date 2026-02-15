1. Notification system - for messages, journey updates, likes/comments in the dreams shared in community tab, reminders for the dreams when due dates are about to be reached, etc. -- In app notifications working. Push notifications remaining to test.

2. Storage optimization for the images with security best practises. -- completed

3. Data privacy and encryption of all the messages or any important factors. -- completed, Later found - For dreams - title and descriptions are not encrypted. Progress tab - description, expense is encrypted. Will think of adding more parts to encrypt. I feel atleast Title should be encrypted and the Progress tab all data should be encrypted, not just description. What do you think aboout adding more fields for encryption?
When a dream is public, encryption applied to progress n expense tabs.

4. Implement Loading screen for the entire application. Not just a simple indicator, but an impressive design which shows a "bucket" and something which resembles the bucketist. the screen should be visible whenever the app is fetching data from the server. -- completed (the bucket icon is not proper. need to redesign the bucket icon)

5. Journeys should come as a dream for the users who are part of the journey in the home page as well. They should have permission for updating the dream as well. -- completed

6. Dreams under "Journeys" should not come under community tab by default. Community tab is specifically for the dreams which are created by the user and are public. Users can opt to share their journeys as well to community tab by updating the toggle button in the dream details page. Users can share completed dreams/milestones/achievements of a dream in progress in the community tab. Not the dreams which are in "Dream" state. -- completed

7. Users can opt to share journeys which are completed or in progress to the community tab. -- completed

8. Complete check of the UI/UX design and any modifications if required.

9. Implement the Light and dark mode support. Complete the onboarding flow. Complete profile page updates and information properly. 

10. Implement story feature, which will show dream pictures, notes,etc completed by user in a timeline format grouped based on dream.

11. Add AI features to the app. AI in automating the stories, AI in generating the dream ideas, AI in generating the dream pictures, AI in generating the dream notes, etc.

12. The community screen fetches data every time user switches and comes back to the screen. This should be optimized. -- completed

13. Polish & Launch - Phase 5 and 6 from roadmap.md
    - Premium Animations
    - Performance Optimization
    - Analytics Integration
    - A/B Testing Framework
    - App Store Assets
    - Launch Checklist

14. When i click on the Profile photo, it takes me to the profile page. But im seeing two headers. One is the default header with name profile/[id] and the other is the header which is part of the profile page. This should be fixed. -- completed

15. One error i noticed - I started a dream as a journey and the dream is visible in the other user's explore tab. Then i delete the dream, but it is still visible in the other user's explore tab. This should be fixed. 

16. User clicked on start a journey from the dream details page, journey started. But the UI didnt got changed in the dream details page. It was still showing "Start a Journey" button until i go back and reopen the dream. This should be fixed. -- completed

17. In the details page, the Pending requests should show the Name of the user. Currently it showing userid from the db(which is a random string). Similarly for the comments. -- completed

18. When the user who joined the journey, tried to do any changes to the dream, it was showing some permission error. Insufficient permissions. -- completed.

19. In shared journeys, when one user updates the dream, it should reflect the changes for all the users who have joined the journey instantly. Currently it is not reflecting the changes instantly. It is taking some time and then i need to refresh the page to see the changes -- completed.

20. No notification recieved to owner when someone requests to join the journey.

21. Need to implement clean up activity for backend in most cases. Check where no clean up activity is not implemented and come up with a plan to implement it. -- completed

22. Now when i open a chat which is created for a journey, it keeps on showing the skeleton. Not showing the chatscreen. -- completed

23. Even though i add multiple inspirations to the dream, it is not showing up in the dream details page. Only the 1st inspiration is visible. But in DB they are getting saved. -- completed

24. Second thought on the loading screen - instead of having this bucket icon to load as the loading screen, lets have some animation of a checklist where some random dreams are being crossed over. Each time when loading it will show different items, random items being crossed over. -- completed

25. Currently CRUD operations on a dream is taking some time. Need to optimize it. -- completed

26. The community tab should be like a social media feed. Its not necessary that we should see our dreams in the community tab. We should see the dreams of other users. Also i would like to add a feature where users can add a post before sharing the dream to community, in that way it feels more like a social media feed -- completed

27. Currently if i want to share a dream to community, i want to go into edit and then toggle. I want you to think a more feasiable and user friendly way to implement this in a better way. Maybe like a share button in the dream details page. -- completed

28. CommunityPostActionMenu - Report and Block User commented out - will implement full functionality later.