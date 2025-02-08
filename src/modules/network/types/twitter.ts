// 基础响应接口
export interface TwitterListResponse {
  tweets: Tweet[];
  cursor: string;
}

// 推文接口
export interface Tweet {
  entryId: string;
  sortIndex: string;
  content: {
    entryType: string;
    __typename: string;
    itemContent?: {
      itemType: string;
      __typename: string;
      tweet_results: {
        result: TweetResult;
      };
      tweetDisplayType: string;
    };
    clientEventInfo: {
      component: string;
      element: string;
      details: {
        timelinesDetails: {
          injectionType: string;
        };
      };
    };
  };
}

// 推文结果接口
export interface TweetResult {
  __typename: string;
  rest_id: string;
  core: {
    user_results: {
      result: UserResult;
    };
  };
  unmention_data: any;
  edit_control: {
    edit_tweet_ids: string[];
    editable_until_msecs: string;
    is_edit_eligible: boolean;
    edits_remaining: string;
  };
  is_translatable: boolean;
  views: {
    count: string;
    state: string;
  };
  source: string;
  legacy: TweetLegacy;
  quoted_status_result?: {
    result: TweetResult;
  };
}

// 用户结果接口
export interface UserResult {
  __typename: string;
  rest_id: string;
  affiliates_highlighted_label: {
    label?: {
      url: {
        url: string;
        urlType: string;
      };
      badge: {
        url: string;
      };
      description: string;
      userLabelType: string;
      userLabelDisplayType: string;
    };
  };
  has_graduated_access: boolean;
  is_blue_verified: boolean;
  profile_image_shape: string;
  legacy: UserLegacy;
  professional?: {
    rest_id: string;
    professional_type: string;
    category: any[];
  };
  super_follow_eligible: boolean;
}

// 推文Legacy接口
export interface TweetLegacy {
  bookmark_count?: number;
  bookmarked?: boolean;
  created_at: string;
  conversation_id_str: string;
  display_text_range: number[];
  entities: {
    hashtags?: Array<{
      text: string;
      indices: number[];
    }>;
    urls?: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
      indices: number[];
    }>;
    user_mentions?: Array<{
      id_str: string;
      name: string;
      screen_name: string;
      indices: number[];
    }>;
    media?: Array<MediaEntity>;
  };
  favorite_count: number;
  favorited: boolean;
  full_text: string;
  id_str: string;
  in_reply_to_screen_name?: string;
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id_str?: string;
  is_quote_status: boolean;
  lang: string;
  quote_count?: number;
  quoted_status_id_str?: string;
  quoted_status_permalink?: {
    url: string;
    expanded: string;
    display: string;
  };
  reply_count: number;
  retweet_count: number;
  retweeted: boolean;
  user_id_str: string;
  extended_entities?: {
    media?: Array<MediaEntity>;
  };
}

// 用户Legacy接口
export interface UserLegacy {
  can_dm: boolean;
  can_media_tag: boolean;
  created_at: string;
  default_profile: boolean;
  default_profile_image: boolean;
  description: string;
  entities: {
    description: {
      urls: any[];
    };
    url?: {
      urls: UrlEntity[];
    };
  };
  fast_followers_count: number;
  favourites_count: number;
  followers_count: number;
  friends_count: number;
  has_custom_timelines: boolean;
  is_translator: boolean;
  listed_count: number;
  location: string;
  media_count: number;
  name: string;
  normal_followers_count: number;
  pinned_tweet_ids_str: string[];
  possibly_sensitive: boolean;
  profile_banner_url?: string;
  profile_image_url_https: string;
  profile_interstitial_type: string;
  screen_name: string;
  statuses_count: number;
  translator_type: string;
  verified: boolean;
  want_retweets: boolean;
  withheld_in_countries: any[];
}

// URL实体接口
export interface UrlEntity {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: number[];
}

// 用户提及接口
export interface UserMention {
  id_str: string;
  name: string;
  screen_name: string;
  indices: number[];
  url?: string;
}

// 媒体实体接口
export interface MediaEntity {
  display_url: string;
  expanded_url: string;
  id_str: string;
  indices: number[];
  media_key: string;
  media_url_https: string;
  type: string;
  url: string;
  additional_media_info?: {
    monetizable: boolean;
    source_user?: {
      user_results: {
        result: UserResult;
      };
    };
  };
  ext_media_availability: {
    status: string;
  };
  sizes: {
    large: MediaSize;
    medium: MediaSize;
    small: MediaSize;
    thumb: MediaSize;
  };
  original_info: {
    height: number;
    width: number;
    focus_rects?: any[];
  };
  video_info?: {
    aspect_ratio: number[];
    duration_millis: number;
    variants: VideoVariant[];
  };
}

// 媒体尺寸接口
export interface MediaSize {
  h: number;
  w: number;
  resize: string;
}

// 视频变体接口
export interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}
