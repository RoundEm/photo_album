import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import formatDate from "../utils/formatDate";
import { getPlaiceholder } from "plaiceholder";

const cloudinary = require("cloudinary/lib/cloudinary").v2;

const AlbumLocation = styled.p`
  color: rgb(255, 51, 126);
`;
const AlbumDate = styled.p`
  color: rgb(255, 219, 232);
`;
const AlbumPreviewImgContainer = styled.div`
  & img {
    width: 450px;
    @media (max-width: 650px) {
      width: 95%;
    }
  }
`;

export default function Home({ previewData }) {
  console.log("previewData: ", previewData);
  const [photoAlbumPreviews, setPhotoAlbumPreviews] = useState(previewData);

  return (
    <div>
      <Head>
        <title>Photo Albums</title>
        <meta name="description" content="Photography by Jason Roundtree" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main>
        <h1>Hiking Photo Albums</h1>

        <ul>
          {photoAlbumPreviews.map(({ resources }) => {
            // console.log(`resources: `, resources)
            // TODO: tag and query preview image directly
            if (resources.length) {
              const {
                context = "",
                folder: folderPath,
                asset_id,
                url,
                height,
                width,
              } = resources[0];

              return (
                <li key={asset_id}>
                  <AlbumLocation>{context.display_location}</AlbumLocation>
                  <AlbumDate>{formatDate(context.date).monthAndYear}</AlbumDate>

                  <Link href={`/album/${folderPath}`}>
                    <a>
                      <AlbumPreviewImgContainer>
                        <Image
                          src={url}
                          alt={`Preview image of photo album from ${context.display_location} on ${context.date}`}
                          height={height}
                          width={width}
                          // blurDataURL={LQIPify(url)}
                          // placeholder="blur"
                        />
                      </AlbumPreviewImgContainer>
                    </a>
                  </Link>
                </li>
              );
            }
          })}
        </ul>
      </main>

      {/* <footer> */}
      {/* <a
          target="_blank"
          rel="noopener noreferrer"
        >
        </a> */}
      {/* </footer> */}
    </div>
  );
}

async function getPhotoAlbum(collection, name) {
  const album = await cloudinary.search
    .expression(`${collection}/${name}/*`)
    .with_field("context")
    .execute()
    .then((res) => {
      return res;
    })
    .catch((err) => console.log("error querying for photo album: ", err));

  return album;
}

async function getPreviewImage(collection, name) {
  const previewImageData = await cloudinary.search
    .expression(
      `
        ${collection}/${name}/*
        AND
        context:preview_image
    `
    )
    .with_field("context")
    .execute()
    .then((data) => {
      // console.log('previewImage: ', data)
      return data;
    })
    .catch((err) => console.log("error querying for preview image: ", err));

  return previewImageData;
}

export async function getStaticProps() {
  const { folders: albumPaths } = await cloudinary.api.sub_folders(
    "outdoors",
    (err, res) => {
      if (!err) {
        // console.log('folders res: ', res)
        return res;
      } else {
        console.log("error fetching subfolders: ", err);
      }
    }
  );

  const albumsPreviewData = await Promise.all(
    albumPaths.map(({ name, path }) => {
      const collection = path.split("/")[0];
      return getPreviewImage(collection, name);
    })
  )
    .then((data) => {
      // TODO: add a test to check if a previewImage hasn't been set? (e.g. total_count: 0)
      // console.log('preview data: ', data.resources[0])
      return data;
    })
    .catch((err) =>
      console.log("Error fetching photo album from getStaticProps: ", err)
    );

  const serializedPreviewData = albumsPreviewData
    .filter(({ resources }) => {
      if (!resources[0]) return false;
      return true;
    })
    .map(({ resources }) => {
      let folderPath = resources[0].folder;
      let date = resources[0]?.context?.date;
      return {
        resources: resources,
        folderPath: folderPath,
        date: date || "",
      };
    })
    .sort(
      (a, b) => formatDate(b.date).dateObject - formatDate(a.date).dateObject
    );

  return {
    props: {
      previewData: serializedPreviewData,
    },
  };
}
