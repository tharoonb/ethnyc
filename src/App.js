import React, { Component } from "react";
import "./App.css";
import logo from "./assets/img/Logo.svg"
import icon from "./assets/img/icon.png"
import bird from "./assets/img/bird.png"
import startvote from "./assets/img/startvote.svg"
import topButton from "./assets/img/topButton.svg"
import page2 from "./assets/img/page2.svg"
import Votecard from "./Votecard"

import { useState, useEffect, useReducer } from 'react';
import { FeedDAC, IdentityDAC, ProfileDAC, SocialDAC } from 'skynet-dacs-library';
import { getSkylinkUrlForPortal, SkynetClient } from 'skynet-js';
import {
  mockHackerAvatar,
  mockIdeas,
  mockProfileAvatar,
  mockUserProfile,
} from './data/mockData';
import _ from 'lodash'

// Used in AuthButton.js
export const useProfile = (userAuthStatus, isKernelLoaded) => {
  // Mock data to be replaced by DAC data
  return {
    userProfile: mockUserProfile, //current userProfile from ProfileDAC
    avatar: mockProfileAvatar, //current user's avatar URL
  };

  const [userProfile, setUserProfile] = useState();
  const [avatar, setAvatar] = useState();

  // // Once logged in and kernelLoaded:
  // // Get userId and use it to fetch user's profile
  // // Using the profile, get a URL for accessing the profile image.

  useEffect(() => {
    const getUserID = async () => {
      try {
        let identityDAC = new IdentityDAC();
        const userID = await identityDAC.userID();
        console.log(userID);

        let profileDAC = new ProfileDAC();
        const result = await profileDAC.getProfile(userID);
        console.log('got result from profile');
        console.log(result);
        setUserProfile(result);
        setAvatar(avatarFieldToUrl(result?.avatar));

        let socialDAC = new SocialDAC();

      } catch (err) {
        console.error({ err });
      }
    };

    if (userAuthStatus && isKernelLoaded) {
      getUserID();
    }
  }, [userAuthStatus, isKernelLoaded]);

  return {
    userProfile, //current userProfile from ProfileDAC
    avatar, //current user's avatar URL
  };
};

// helper method for getting user's profile avatarURL given userId
// used in Hacker.js, where it maintains list and state
export const getUserAvatar = async (userID) => {
  // return mock data for now.
  return mockHackerAvatar;

  let profileDAC = new ProfileDAC();
  const result = await profileDAC.getProfile(userID);
  return avatarFieldToUrl(result?.avatar);
};

// Used in Hackers.js
export const followUserList = async (userIds, extKey, extValue) => {
  // mock void return
  return;

  const socialDAC = new SocialDAC();

  for (const userId of userIds) {
    console.log('following: ', userId);
    if (extKey && extValue) {
      await socialDAC.follow(userId, { extKey: extValue });
    } else {
      await socialDAC.follow(userId);
    }
  }
};

// Used in IdeaFeed.js
// Notice we handle state and list iteration here, unlike
// the standalone function of getUserAvatar and it use in Hackers.js
export const useIdeasFeed = (userAuthStatus, isKernelLoaded) => {
  // Mock data to be replaced by DAC data
  // return {
  //   ideasList: mockIdeas,
  //   loadingProgress: 100,
  //   userProfiles: {},
  // };

  const profileDAC = new ProfileDAC();

  const [loadingProgress, setLoadingProgress] = useState(1);
  const [loadedUsers, setLoadedUsers] = useState(0);

  const getUserProfile = async (userId) => {
    const profile = await profileDAC.getProfile(userId);
    const username = profile?.username
    const avatar = avatarFieldToUrl(profile?.avatar)

    dispatchUserProfiles({userId, avatar, username})
  }

  const [userProfiles, dispatchUserProfiles] = useReducer((state, action) => {

    const key = action.userId;
    const value = {avatar: action.avatar, username:action.username}

    return {...state, [key]: value}
  }, {});

  // dispatched called once per user's posts list
  const [ideasList, dispatchIdeasList] = useReducer((state, action) => {

    // only fetch profile if we are showing posts
    // separate reducer to not block anything
    if (action.posts.length){
      getUserProfile(action.posts[0].userId);
    }

    // take the FeedDAC's post and grab relevant data.
    const postsToIdeas = action.posts.map((post)=>{

      return   {
        id: post.id, // sequential, unique per user, not globally unique
        userId: post.userId,
        title: post.content?.title,
        text: post.content?.text,
        ext: {
          // event: post.content.ext?.event,
          options: ["yes", "yes", "yes"],
          wc: post.content.ext?.wc,
          tc: post.content.ext?.tc, // target count
        },
        ts: post.ts,
      }
    })
    console.log(postsToIdeas)
    const mergePostLists = _.uniqBy([...state, ...postsToIdeas], "ts"); // id isn't uuid, so this should be refined for production
    console.log(`mergedList after ${action.userId}:`, mergePostLists);
    setLoadingProgress(((loadedUsers+1)/(hackerUserIds.length + 1))*100);
    setLoadedUsers(loadedUsers+1);
    console.log(mergePostLists);
    return mergePostLists;
  }, []);

  // Once logged in and kernelLoaded:
  // Use hackerUserIds + logged in userId to generate list of all feed posts
  // ordered by date. Might need to adjust this.

  useEffect(() => {
    const getIdeasList = async () => {
      try {
        let identityDAC = new IdentityDAC();
        const loggedInUser = await identityDAC.userID();
        const userList = [...hackerUserIds, loggedInUser ];

        let feedDAC = new FeedDAC();

        for (const userId of userList) {
          console.log('loading posts for user: ', userId);
          const posts = await feedDAC.loadPostsForUser(userId);
          console.log(posts);
          const ideas = posts.filter((post)=> post?.content?.ext?.wc)
          // const ideas = posts;
          dispatchIdeasList({ posts: ideas, userId });
        }
      } catch (err) {
        console.error({ err });
      }
    };

    if (userAuthStatus && isKernelLoaded) {
      getIdeasList();
    }
  }, [userAuthStatus, isKernelLoaded]);

  let returnVals = {
    image: bird,
    title: "pls work",
    subtitle: "yo istg daniel",
    count: 6,
    options: ["yes", "no", "maybe"],
    targetCount: 69
  };

  return returnVals;

};

//method for creating a post tailored to our app using FeedDAC
// take form data and call FeedDAC's createPost
// Used in NewIdeaCard.js
export const createPost = async ({
  title,
  text,
  event,
  prizeTrack,
  techStack,
  seekingTeam,
}) => {

  //mock return
  // return;

  const feedDAC = new FeedDAC();

  const post = {
    title,
    text,
    ext: { event, prizeTrack, techStack, seekingTeam, wc: "1.0.0" },
  };

  console.log(post);

  let result;
  try {
    result = await feedDAC.createPost(post);
    console.log('Result: ', result);
  } catch (error) {
    console.error({ error });
  }
};

const SKYNET_PORTAL = 'https://siasky.net';

// current Skynet Kernel doesn't handle downloading dataurls or creating preferred portal URLs
// so here we use skynet-js to quickly construct URLs.
const avatarFieldToUrl = (avatar) => {
  if (avatar && avatar[0]?.url){
    return getSkylinkUrlForPortal(SKYNET_PORTAL, avatar[0].url);
  } else {
    return '';
  }
};

export const addFriend = () => {
  const socialDAC = new SocialDAC();
  SocialDAC.follow(document.getElementById("friendInput").value);
  // hackerUserIds.push(document.getElementById("friendInput").value);
  console.log(hackerUserIds);
};

// Here we'll bootstrap by hard-coding userIDS (most users might not have a social graph yet.)
// We could create a MySky identity just for creating friendlists which can be loaded in dynamically.
// These could use the `ext` field to designate a list name, event, etc.
// Used for useIdeaFeed and in Hackers.js

const socialDAC = new SocialDAC();
export const hackerUserIds = [
  // '4235b7d3928b2a1946bdbc807de3fc52827f382ee1c4637dfeea4217347b8bff',
  // 'c012eb2d458162fe4d3f18b88f5b1e5468e4a2f88e3f43d00c9de2b66d73df77',
  // "c360b6045bc243eb0cdf483f461faafa123cd06a9295c490220ea850938b6c6e", // newer source userid
  // 'c6905fbde67575a8fbcb7c229a4f1169f2a35a29721802408fd227b103e789e6', //Delivator test
  // '050da969ae6761f8b6a92ab4e9ef587d8f12deaf8c1c07487711bd989320e55d', //Skunk_Ink test
  // '93d487d5211d826c09e7faf56ca5e092d67dc7e8b9017e1d336eaeaf16e65236', //redsolver
  // 'c3e1e5f4d032f931a91c1f396fa2ceb7347dbf80fe8b7360aa91bd6d4336da48', // Demo User, 2 idea, username and avatar
  // 'bce426a6fc75204ea4e3edb4093090309a6d16e1442766fa12925f9a94d4e7b6', //Demo User with 2 Ideas
];

const cardMockDatas = [
  {
    image: bird,
    title: "Vote for the protection of wildlife",
    subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et, at volutpat arcu, ut odio montes. Sed integer lobortis massa nisi, posuere.",
    count: 23541,
    targetCount: 30000,
    options: ["yes", "yes", "yes"]

    // id: 12345, // sequential, unique per user, not globally unique
    // userId: "shitcum",
    // title: "Vote for the protection of wildlife",
    // text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et, at volutpat arcu, ut odio montes. Sed integer lobortis massa nisi, posuere.",
    // ext: {
    //   aff : "yes",
    //   neg : "yes",
    //   mid : "yes",
    // },
  },
  {
    image: bird,
    title: "Vote for the protection of kingston",
    subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et, at volutpat arcu, ut odio montes. Sed integer lobortis massa nisi, posuere.",
    count: 321551,
    targetCount: 351551,
    options: ["yes", "maybe", "no"]
  },
  // {
  //   image: bird,
  //   title: "Vote for the protection of kavin",
  //   subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et, at volutpat arcu, ut odio montes. Sed integer lobortis massa nisi, posuere.",
  //   count: 35132,
  //   targetCount: 45132,
  //   options: ["hi", "hello", "yes"]
  // },
  // {
  //   image: bird,
  //   title: "Vote for the protection of not tom",
  //   subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Et, at volutpat arcu, ut odio montes. Sed integer lobortis massa nisi, posuere.",
  //   count: 31314,
  //   targetCount: 51314,
  //   options: ["tom", "not", "tom"]
  // },
]



class App extends Component {

  constructor(props) {
    super(props);
    const {
      subtitle,
      text,
      title,
      voteForTheProtectionOfWildlife,
      loremIpsumDolorSi,
      spanText1,
      spanText2,
      yes,
      maybe,
      place,
    } = props;
    this.state = {};
  }

  render() {
    return (
      <div>
        <div className="navbar">
          <div className="logoBox">
            <img src={logo} alt="Logo"/>
            <img src={icon} className="icon"/>
          </div>

          <img src={startvote} alt="startvote"/>
        </div>

        <div className="content">
          <span className="devoted-to-dem"> Devoted to democracy. </span>
          <span className="subtitle"> Protect the power of your votes from being stolen by fake voters.</span>
          <img className="topButton" src={topButton} />
          <span className="trendingVote"> Trending Vote </span>

          <Votecard {...cardMockDatas[0]}/>

          <img src={page2} className="page2"/>

          <div className="page3">
            <div className="menu">
              <div className="menuItem">
                <span className="menuSelected"> Featured </span>
              </div>
              <div className="menuItem">
                <span className="menuUnselected"> Popular </span>
              </div>
              <div className="menuItem">
                <span className="menuUnselected"> Recent </span>
              </div>
              <div className="menuItem">
                <span className="menuUnselected"> Completed </span>
              </div>
            </div>

            {useIdeasFeed(true, true).map(data => <Votecard {...data}/>)}

          </div>

        </div>


      </div>
    );
  }
}

export default App;
